import { Chapters, QuranReader, Words } from "@/types";
import { defineComponent, PropType, ref, watch, onBeforeUnmount, VNode, computed, Teleport, onMounted } from "vue";
import { Tooltip as BSTooltip, Popover as BSPopover } from "bootstrap";
import { useI18n } from "vue-i18n";
import { useChapters } from "@/hooks/chapters";
import Tooltip from "../Tooltip/Tooltip";
import ButtonBookmark from "./Button/Bookmark";
import ButtonCopy from "./Button/Copy";
import ButtonTafsir from "./Button/Tafsir";
import ButtonPlay from "./Button/Play";
import Popover from "../Popover/Popover";
import styles from "./ArabicText.module.scss";
import AlertDialog from "../AlertDialog/AlertDialog";
import { useSettings } from "@/hooks/settings";

interface MarkedError {
    word: Words | null; // Bisa null jika kesalahan pada level ayat
    errorType: string;
    verseNumber: number;
    chapterName: string;
    isVerseError: boolean; // Flag untuk menandai kesalahan pada level ayat
}

export default defineComponent({
    props: {
        words: {
            type: Array as PropType<Words[]>,
            required: true
        },
        chapterId: {
            type: Number
        },
        verseNumber: {
            type: Number
        },
        highlight: {
            type: [Number, Boolean],
            default: false
        },
        enableHover: {
            type: Boolean,
            default: false
        },
        showTooltipWhenHighlight: {
            type: Boolean,
            default: false
        },
        showTransliterationInline: {
            type: Boolean,
            default: false
        },
        showTranslationInline: {
            type: Boolean,
            default: false
        },
        showTransliterationTooltip: {
            type: Boolean,
            default: false
        },
        showTranslationTooltip: {
            type: Boolean,
            default: false
        },
        buttons: {
            type: Array as PropType<QuranReader["PROPS_BUTTON"]>,
            default: () => []
        },
    },
    
    setup(props) {
        const { t } = useI18n();
        const chapters = useChapters();
 const settings = useSettings();
 const { fontType } = settings;
        const tooltipInstance = ref<Record<number, BSTooltip>>({});
        const popoverInstance = ref<Record<number, BSPopover>>({});
        const popover = ref<BSPopover | null>(null);
        const isHover = ref<boolean>(false);
        const isModalVisible = ref<boolean>(false);
        const modalContent = ref<string>("");
        const refs = ref<{ popoverContent: HTMLElement | null }>({
            popoverContent: null
        });
    
        const verseKey = computed<string>(() => {
            return [props.chapterId, props.verseNumber].filter(v => v !== undefined).join(":");
        });
    
        const chapter = computed<Chapters | null>(() => {
            return props.chapterId ? chapters.find(props.chapterId) : null;
        });
    
        const textUthmani = computed<string>(() => {
            return props.words.map(word => word.text_uthmani).join(" ");
        });
    
        const shouldUseButton = computed<boolean>(() => {
            return props.buttons.length > 0 && props.chapterId !== undefined && props.verseNumber !== undefined;
        });
    
        const correctionTarget = ref<'ayat' | 'kata'>('kata');
        const selectedWord = ref<Words | null>(null);
        const markedErrors = ref<MarkedError[]>([]);
    
        const errorColors: { [key: string]: string } = {
            'Gharib': '#CCCCCC',
            'Ghunnah': '#99CCFF',
            'Harokat Tertukar': '#DFF18F',
            'Huruf Tambah/Kurang': '#F4ACB6',
            'Lupa (tidak dibaca)': '#FA7656',
            'Mad (panjang pendek)': '#FFCC99',
            'Makhroj (pengucapan huruf)': '#F4A384',
            'Nun Mati dan Tanwin': '#F8DD74',
            'Qalqalah (memantul)': '#D5B6D4',
            'Tasydid (penekanan)': '#B5C9DF',
            'Urutan Huruf atau Kata': '#FE7D8F',
            'Waqof atau Washol (berhenti atau lanjut)': '#A1D4CF',
            'Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA',
            'Lainnya': '#CC99CC',
            'Ayat Lupa (tidak dibaca)': '#FA7656',
            'Ayat Waqof atau Washol (berhenti atau lanjut)': '#FE7D8F',
            'Ayat Waqof dan Ibtida (berhenti dan memulai)': '#90CBAA',
            'LainNya': '#CC99CC',
        };
        
    
        function isHighlightWord(position: number) {
            return (props.highlight === position);
        }
    
    
        function onInitPopover(key: number) {
            return function (popover: BSPopover) {
                popoverInstance.value[key] = popover;
            };
        }
    
        function onClickHold(key: number) {
            return function () {
                Object.keys(popoverInstance.value).forEach((keys) => Number(keys) !== key && popoverInstance.value[Number(keys)]?.hide());
                popoverInstance.value[key]?.toggle();
                setTimeout(() => tooltipInstance.value[key]?.hide(), 100);
            };
        }
    
        function showWrongWordModal(word: Words, isVerseEnd = false) {
            const isAlreadyMarked = markedErrors.value.some(err => 
                (isVerseEnd && err.verseNumber === props.verseNumber) || // Cek apakah ayat sudah diblok
                (!isVerseEnd && err.word?.text_uthmani === word.text_uthmani) // Cek apakah kata sudah diblok
            );
        
            if (isAlreadyMarked) {
                // Jika sudah diblok, tampilkan opsi "Hapus Tanda"
                correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
                modalContent.value = isVerseEnd
                    ? `Hapus tanda pada ayat ${props.verseNumber}`
                    : `Hapus tanda pada kata "${word.text_uthmani}" `;
                isModalVisible.value = true;
            } else {
                // Jika belum diblok, tampilkan opsi untuk menambahkan tanda
                correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
                modalContent.value = isVerseEnd
                    ? `Surat ${chapter.value?.name_simple} Ayat ke ${props.verseNumber}`
                    : `Kata ${word.text_uthmani}`;
                isModalVisible.value = true;
            }
        }
    
        function getWordStyle(word: Words) {
            const error = markedErrors.value.find(err =>
                (err.isVerseError && err.verseNumber === props.verseNumber) ||
                (!err.isVerseError && err.word?.text_uthmani === word.text_uthmani)
            );
            if (error && error.errorType in errorColors && !error.isVerseError) {
                return { backgroundColor: errorColors[error.errorType] };
            }
            return {};
        }
    
        function handleKeydown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                closeModal();
            }
        }
    
        function markError(word: Words | null, errorType: string, isVerseError: boolean = false) {
            if (word || isVerseError) {
                markedErrors.value.push({
                    word,
                    errorType,
                    verseNumber: props.verseNumber!,
                    chapterName: chapter.value?.name_simple || '',
                    isVerseError
                });
                saveMarkedErrors();
                closeModal();
            }
        }
    
        function removeMarkedError(word: Words | null, isVerseError: boolean = false) {
            if (isVerseError) {
                // Hapus tanda kesalahan berdasarkan ayat
                markedErrors.value = markedErrors.value.filter(err => 
                    err.verseNumber !== props.verseNumber || !err.isVerseError
                );
                console.log('Kesalahan pada ayat berhasil dihapus:', {
                    verseNumber: word?.verseNumber,
                    chapterName: word?.chapterName
                });
            } else if (word) {
                // Hapus tanda kesalahan berdasarkan kata
                markedErrors.value = markedErrors.value.filter(err => 
                    err.word?.text_uthmani !== word.text_uthmani
                );
                console.log('Kesalahan pada kata berhasil dihapus:', {
                    word: word.text_uthmani,
                    position: word.position,
                    verseNumber: word.verseNumber,
                    chapterName: word.chapterName
                });
            }
            
            saveMarkedErrors(); // Simpan perubahan ke localStorage
            closeModal(); // Tutup modal
        }

        function viewAllMarkedErrors() {
            try {
                // Baca data dari localStorage
                const data = localStorage.getItem('markedErrors');
                if (!data) {
                    console.log('Tidak ada data kesalahan yang tersimpan.');
                    return;
                }
        
                // Parse data
                const markedErrors = JSON.parse(data);
        
                // Filter data untuk ayat dan kata
                const verseErrors = markedErrors.filter((error: { isVerseError: any; }) => error.isVerseError);
                const wordErrors = markedErrors.filter((error: { isVerseError: any; }) => !error.isVerseError);
        
                // Tampilkan rekapan ayat
                if (verseErrors.length > 0) {
                    console.log('Rekapan Kesalahan pada Ayat:');
                    verseErrors.forEach((error: { verseNumber: any; chapterName: any; errorType: any; }, index: number) => {
                        console.log(`${index + 1}. Ayat ${error.verseNumber} (${error.chapterName}): ${error.errorType}`);
                    });
                } else {
                    console.log('Tidak ada kesalahan pada ayat yang ditandai.');
                }
        
                // Tampilkan rekapan kata
                if (wordErrors.length > 0) {
                    console.log('Rekapan Kesalahan pada Kata:');
                    wordErrors.forEach((error: { word: { text_uthmani: any; position: any; }; verseNumber: any; chapterName: any; errorType: any; }, index: number) => {
                        console.log(`${index + 1}. Kata "${error.word?.text_uthmani}" (Posisi: ${error.word?.position}, Ayat ${error.verseNumber}, ${error.chapterName}): ${error.errorType}`);
                    });
                } else {
                    console.log('Tidak ada kesalahan pada kata yang ditandai.');
                }
            } catch (error) {
                console.error("Gagal memuat rekapan data kesalahan:", error);
            }
        }
        

        function saveMarkedErrors() {
            try {
                // Simpan data ke localStorage
                localStorage.setItem('markedErrors', JSON.stringify(markedErrors.value));
        
                // Ambil data terakhir yang ditambahkan
                const lastMarkedError = markedErrors.value[markedErrors.value.length - 1];
        
                if (lastMarkedError) {
                    if (lastMarkedError.isVerseError) {
                        // Jika yang ditandai adalah ayat
                        console.log('Anda menandai kesalahan pada ayat:', {
                            verseNumber: lastMarkedError.verseNumber,
                            errorType: lastMarkedError.errorType,
                            chapterName: lastMarkedError.chapterName
                        });
                    } else {
                        // Jika yang ditandai adalah kata
                        console.log('Anda menandai kesalahan pada kata:', {
                            word: lastMarkedError.word?.text_uthmani,
                            position: lastMarkedError.word?.position,
                            errorType: lastMarkedError.errorType,
                            verseNumber: lastMarkedError.verseNumber,
                            chapterName: lastMarkedError.chapterName
                        });
                    }
                }
        
                console.log('Data kesalahan berhasil disimpan.');
            } catch (error) {
                console.error("Gagal menyimpan data kesalahan:", error);
            }
        }
    
        function handleVerseClick() {
            if (props.chapterId && props.verseNumber) {
                modalContent.value = `Anda mengklik seluruh ayat ${props.verseNumber} dari surat ${props.chapterId}`;
                isModalVisible.value = true;
            }
        }
    
        function closeModal() {
            isModalVisible.value = false;
        }
    
        function onMouseOver(key: number) {
            isHover.value = true;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
                tooltipInstance.value[key]?.show();
            }
        }
    
        function onMouseLeave(key: number) {
            isHover.value = false;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
                tooltipInstance.value[key]?.hide();
            }
        }
    
        function wordWrapper(word: Words, children: VNode) {
            if (!shouldUseButton.value) {
                return (
                    <>
                        {children}
                    </>
                );
            } else {
                return (
                    <Popover
                        key={`popover-${word.id}`}
                        placement="top"
                        options={{ html: true, trigger: "manual", content: () => refs.value.popoverContent! }}
                        onInit={onInitPopover(word.position)}
                        v-clickHold:$300_vibrate={onClickHold(word.position)}
                    >
                        {{
                            title: () => (
                                <div class="text-center">
                                    {t("quran-reader.word-number", { ayah: props.verseNumber })}
                                </div>
                            ),
                            default: () => children
                        }}
                    </Popover>
                );
            }
        }
    
        function selectWord(position: number) {
            selectedWord.value = props.words.find(word => word.position === position) || null;
        }
    
        onMounted(() => {
            window.addEventListener("keydown", handleKeydown);
        });
    
        onBeforeUnmount(() => {
            window.removeEventListener("keydown", handleKeydown);
            isHover.value = false;
            Object.keys(tooltipInstance.value).forEach((key) => tooltipInstance.value[Number(key)]?.hide());
            Object.keys(popoverInstance.value).forEach((key) => popoverInstance.value[Number(key)]?.hide());
        });
    
        watch(() => props.highlight, (value, oldValue) => {
            if (!props.showTooltipWhenHighlight) {
                return;
            }
    
            if (typeof value === "number") {
                tooltipInstance.value[value]?.show();
            }
    
            if (typeof oldValue === "number") {
                tooltipInstance.value[oldValue]?.hide();
            }
        });
    
        watch(() => props.showTooltipWhenHighlight, (value) => {
            if (typeof props.highlight == "number") {
                tooltipInstance.value[props.highlight]?.[value ? "show" : "hide"]();
            }
        });
        
        function getVerseErrorStyle() {
            const verseError = markedErrors.value.find(err =>
                err.isVerseError && err.verseNumber === props.verseNumber
            );
            if (verseError && verseError.errorType in errorColors) {
                if (fontType.value === "Default") {
                    return {
                        backgroundColor: errorColors[verseError.errorType],
                        padding: '26px 1px 14px 1px',
                    };
                } else if (fontType.value === "Uthmanic") {
                    return {
                        backgroundColor: errorColors[verseError.errorType],
                        padding: '28px 1px 13px 1px',
                    };
                }
            }
            return {};
        }
        return {
            tooltipInstance,
            popoverInstance,
            verseKey,
            refs,
            chapter,
            textUthmani,
            popover,
            isHover,
            shouldUseButton,
            isHighlightWord,
            onInitPopover,
            onClickHold,
            onMouseOver,
            onMouseLeave,
            wordWrapper,
            showWrongWordModal,
            handleVerseClick,
            modalContent,
            isModalVisible,
            AlertDialog,
            closeModal,
            correctionTarget,
            selectedWord,
            selectWord,
            markedErrors,
            errorColors,
            getWordStyle,
            markError,
            removeMarkedError,
            getVerseErrorStyle,
            viewAllMarkedErrors
        };
    },
    render() {
        return (
            <>
                <Teleport to="body">
                    {this.isModalVisible && (
                        <div
                            class="modal fade show d-block"
                            tabindex="-1"
                            style={{ background: "rgba(0, 0, 0, 0.5)" }}
                            onClick={this.closeModal}
                        >
                            <div
                                class="modal-dialog modal-dialog-centered"
                                onClick={(e: MouseEvent) => e.stopPropagation()}
                            >
                                <div class="modal-content">
                                    <div class="modal-header">
                                        <h5 class="modal-title">{this.modalContent}</h5>
                                        <button type="button" class="btn-close" onClick={this.closeModal}></button>
                                    </div>
                                    <div class="modal-body">
                                        {this.markedErrors.some(err => 
                                            (this.correctionTarget === 'ayat' && err.verseNumber === this.verseNumber) ||
                                            (this.correctionTarget === 'kata' && err.word?.text_uthmani === this.selectedWord?.text_uthmani)
                                        ) ? (
                                            // Jika sudah diblok, tampilkan tombol "Hapus Tanda"
                                            <button 
                                                class="w-100 mb-2 btn btn-danger" 
                                                onClick={() => this.removeMarkedError(this.selectedWord, this.correctionTarget === 'ayat')}
                                            >
                                                Hapus Tanda
                                            </button>
                                        ) : (
                                            // Jika belum diblok, tampilkan opsi untuk menambahkan tanda
                                            this.correctionTarget === 'kata' ? (
                                                <>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Gharib')} style={{ backgroundColor: "#CCCCCC", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Gharib</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ghunnah')} style={{ backgroundColor: "#99CCFF", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Ghunnah</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Harokat Tertukar')} style={{ backgroundColor: "#DFF18F", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Harokat Tertukar</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Huruf Tambah/Kurang')} style={{ backgroundColor: "#F4ACB6", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Huruf Tambah/Kurang</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lupa (tidak dibaca)')} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Lupa (tidak dibaca)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Mad (panjang pendek)')} style={{ backgroundColor: "#FFCC99", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Mad (panjang pendek)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Makhroj (pengucapan huruf)')} style={{ backgroundColor: "#F4A384", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Makhroj (pengucapan huruf)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Nun Mati dan Tanwin')} style={{ backgroundColor: "#F8DD74", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Nun Mati dan Tanwin</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Qalqalah (memantul)')} style={{ backgroundColor: "#D5B6D4", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Qalqalah (memantul)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Tasydid (penekanan)')} style={{ backgroundColor: "#B5C9DF", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Tasydid (penekanan)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Urutan Huruf atau Kata')} style={{ backgroundColor: "#FE7D8F", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Urutan Huruf atau Kata</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof atau Washol (berhenti atau lanjut)')} style={{ backgroundColor: "#A1D4CF", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Waqof atau Washol (berhenti atau lanjut)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof dan Ibtida (berhenti dan memulai)')} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Waqof dan Ibtida (berhenti dan memulai)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lainnya')} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Lainnya</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Lupa (tidak dibaca)', true)} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Ayat Lupa (tidak dibaca)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Waqof atau Washol (berhenti atau lanjut)', true)} style={{ backgroundColor: "#FE7D8F", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Ayat Waqof atau Washol (berhenti atau lanjut)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Waqof dan Ibtida (berhenti dan memulai)', true)} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Ayat Waqof dan Ibtida (berhenti dan memulai)</button>
                                                    <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'LainNya', true)} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500",textAlign: "left",color: "#000000" }}>Lainnya</button>  
                                                </>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Teleport>
                <span 
                    dir="rtl" 
                    class={[
                        styles.arabic_text,
                        {
                            [styles.highlight]: this.highlight === true,
                            [styles.hover]: this.isHover && this.enableHover,
                            [styles.verse_error]: this.markedErrors.some(err => err.isVerseError && err.verseNumber === this.verseNumber)
                        },
                    ]}
                    style={this.getVerseErrorStyle()} 
                    onMouseover={() => this.isHover = true}
                    onMouseleave={() => this.isHover = false}
                >
                    {this.shouldUseButton && (
                        <div class="d-none">
                            <div ref={(ref) => this.refs.popoverContent = (ref as HTMLElement)} class="d-flex">
                                {this.buttons.includes("Bookmark") && this.chapter !== null && (
                                 <ButtonBookmark
                                    verseKey={this.verseKey}
                                    name={this.chapter.name_simple}
                                    />
                                )}
                                {this.buttons.includes("Copy") && (
                                <ButtonCopy
                                    text={this.textUthmani}
                                    />
                                )}
                                {this.buttons.includes("Tafsir") && (
                                <ButtonTafsir
                                    chapterId={this.chapterId!}
                                    verseNumber={this.verseNumber!}
                                    />
                                )}
                                 {this.buttons.includes("Play") && (
                                 <ButtonPlay
                                    chapterId={this.chapterId!}
                                    verseNumber={this.verseNumber!}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    {this.words.map(word => this.wordWrapper(word, (
                        <Tooltip
                            key={`tooltip-${word.id}`}
                            tag="div"
                            timeout={0} 
                            options={{
                                trigger: "manual",
                                html: true,
                                delay: {show: 500, hide: 2000},
                            }}
                            class={[styles.text_wrapper, {
                                [styles.highlight_word]: this.isHighlightWord(word.position),
                                "ps-2": this.showTransliterationInline
                            }]}
                            {
                                ...{
                                    "data-word-position": word.position,
                                    "data-word-location": word.location,
                                    "data-word-type": word.char_type_name,
                                    "onclick": () => {
                                        this.showWrongWordModal(word, word.char_type_name == "end");
                                        this.selectedWord = word;
                                    }
                                }
                            }
                        >
                            <div
                                class={["fs-arabic-auto text-center", {
                                    "font-uthmanic": word.char_type_name == "end",
                                    "font-arabic-auto": word.char_type_name == "word"
                                }]}
                                style={this.getWordStyle(word)} 
                            >
                                {word.text_uthmani}
                            </div>
                            {this.showTransliterationInline && (
                                <div class="text-center mt-1 mb-1">
                                    <i>{word.char_type_name == "word" ? word.transliteration.text : word.translation.text}</i>
                                </div>
                            )}
                            {this.showTranslationInline && (word.char_type_name == "word" || !this.showTransliterationInline) && (
                                <div class="text-center mt-1 mb-1">
                                    <p>{word.translation.text}</p>
                                </div>
                            )}
                        </Tooltip>
                    )))}
                </span>
            </>
        );
    }
});