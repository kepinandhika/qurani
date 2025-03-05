import { Chapters, QuranReader, Words } from "@/types";
import { defineComponent, PropType, ref, watch, nextTick, onBeforeUnmount, VNode, computed } from "vue";
import { Tooltip as BSTooltip, Popover as BSPopover } from "bootstrap";
import { useI18n } from "vue-i18n";
import { useChapters } from "@/hooks/chapters";
import Tooltip from "../Tooltip/Tooltip";
import Popover from "../Popover/Popover";
import ButtonBookmark from "./Button/Bookmark";
import ButtonCopy from "./Button/Copy";
import ButtonTafsir from "./Button/Tafsir";
import ButtonPlay from "./Button/Play";
import styles from "./ArabicText.module.scss";

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
        // Ubah highlight sehingga nilainya dibandingkan dengan word.id
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
        // Hapus properti showTransliterationInline dan showTranslationInline agar tidak tampil
        // showTransliterationInline: { type: Boolean, default: false },
        // showTranslationInline: { type: Boolean, default: false },
        showTransliterationTooltip: {
            type: Boolean,
            default: false
        },
        showTranslationTooltip: {
            type: Boolean,
            default: false
        },
        // properti buttons tidak lagi dipakai untuk tombol bookmark/copy/tafsir/play
        // karena akan diganti dengan pilihan error
        buttons: {
            type: Array as PropType<QuranReader["PROPS_BUTTON"]>,
            default: () => []
        }
    },
    setup(props) {
        const trans = useI18n();
        const chapters = useChapters();
        const tooltipInstance = ref<Record<number, BSTooltip>>({});
        const popoverInstance = ref<Record<number, BSPopover>>({});
        const isHover = ref<boolean>(false);
        const refs = ref<{ popoverContent: HTMLElement | null }>({
            popoverContent: null
        });
        // Tambahkan ref untuk menyimpan kata yang sedang dipilih
        const currentWord = ref<Words | null>(null);

        const verseKey = computed<string>(() => {
            return [props.chapterId, props.verseNumber].filter(v => v !== undefined).join(":");
        });

        const chapter = computed<Chapters | null>(() => {
            return props.chapterId ? chapters.find(props.chapterId) : null;
        });

        const textUthmani = computed<string>(() => {
            return props.words.map(word => word.text_uthmani).join(" ");
        });

        // Jika chapterId & verseNumber ada, gunakan popover untuk pilihan error
        const shouldUseButton = computed<boolean>(() => {
            return props.chapterId !== undefined && props.verseNumber !== undefined;
        });

        // Ubah perbandingan highlight menggunakan word.id
        function isHighlightWord(wordId: number) {
            return props.highlight === wordId;
        }

        // Inisialisasi tooltip dengan menggunakan word.id sebagai key
        function onInitTooltip(word: Words) {
            return function (tooltip: BSTooltip) {
                tooltipInstance.value[word.id] = tooltip;
                if (props.showTooltipWhenHighlight && isHighlightWord(word.id)) {
                    nextTick(() => {
                        tooltip.show();
                    });
                }
            }
        }

        // Inisialisasi popover dengan menggunakan word.id sebagai key
        function onInitPopover(word: Words) {
            return function (popover: BSPopover) {
                popoverInstance.value[word.id] = popover;
            }
        }

        // Saat menekan (klik) pada sebuah kata, simpan kata tersebut dan toggle popover
        function onClick(word: Words) {
            return function () {
                currentWord.value = word;
                Object.keys(popoverInstance.value).forEach((key) => {
                    if (Number(key) !== word.id) {
                        popoverInstance.value[Number(key)]?.hide();
                    }
                });
                popoverInstance.value[word.id]?.toggle();
                // Sembunyikan tooltip setelah popover muncul
                setTimeout(() => tooltipInstance.value[word.id]?.hide(), 100);
            }
        }

        function onMouseOver(word: Words) {
            isHover.value = true;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(word.id)) {
                tooltipInstance.value[word.id]?.show();
            }
        }

        function onMouseLeave(word: Words) {
            isHover.value = false;
            if (!props.showTooltipWhenHighlight || !isHighlightWord(word.id)) {
                tooltipInstance.value[word.id]?.hide();
            }
        }

        // Fungsi untuk menangani pilihan error
        function onErrorSelect(errorType: string) {
            if (currentWord.value) {
                console.log(`Error selected for word ${currentWord.value.id}: ${errorType}`);
                // Lakukan penanganan lebih lanjut, misalnya emit event atau simpan data error
                popoverInstance.value[currentWord.value.id]?.hide();
            }
        }

        // Bungkus kata dengan Popover jika harus menampilkan tombol error
        function wordWrapper(word: Words, children: VNode) {
            if (!shouldUseButton.value) {
                return <>{children}</>;
            } else {
                return (
                    <Popover
                        key={`popover-${word.id}`}
                        placement="top"
                        options={{ html: true, trigger: "manual", content: () => refs.value.popoverContent! }}
                        onInit={onInitPopover(word)}
                        onClick={onClick(word)}
                    >
                        {{
                            title: () => (
                                <div class="text-center">
                                    {trans.t("quran-reader.word-number", { ayah: props.verseNumber })}
                                </div>
                            ),
                            default: () => children
                        }}
                    </Popover>
                );
            }
        }

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

        onBeforeUnmount(() => {
            isHover.value = false;
            Object.keys(tooltipInstance.value).forEach((key) => tooltipInstance.value[Number(key)]?.hide());
            Object.keys(popoverInstance.value).forEach((key) => popoverInstance.value[Number(key)]?.hide());
        });

        return {
            tooltipInstance,
            popoverInstance,
            verseKey,
            refs,
            chapter,
            textUthmani,
            isHover,
            shouldUseButton,
            isHighlightWord,
            onInitTooltip,
            onInitPopover,
            onClick,
            onMouseOver,
            onMouseLeave,
            onErrorSelect,
            wordWrapper,
            currentWord
        }
    },
    render() {
        return (
            <>
                {/* Hidden popover content untuk pilihan error */}
                {this.shouldUseButton && (
                    <div class="d-none">
                        <div ref={(ref) => this.refs.popoverContent = (ref as HTMLElement)} class="d-flex flex-column">
                            <button class="btn btn-outline-danger mb-1" onClick={() => this.onErrorSelect("Salah Tajwid")}>
                                Salah Tajwid
                            </button>
                            <button class="btn btn-outline-warning mb-1" onClick={() => this.onErrorSelect("Salah Panjang Pendek")}>
                                Salah Panjang Pendek
                            </button>
                            <button class="btn btn-outline-info" onClick={() => this.onErrorSelect("Salah Huruf")}>
                                Salah Huruf
                            </button>
                        </div>
                    </div>
                )}
                <span dir="rtl" class={[
                    styles.arabic_text,
                    { [styles.highlight]: this.highlight === true, [styles.hover]: this.isHover && this.enableHover }
                ]}>
                    {this.words.map(word => this.wordWrapper(word, (
                        <Tooltip
                            key={`tooltip-${word.id}`}
                            tag="div"
                            timeout={0}
                            options={{
                                trigger: "manual",
                                html: true,
                                delay: { show: 500, hide: 2000 },
                                title: () => this.getTooltipText(word) // jika masih diperlukan, bisa disesuaikan atau dihapus
                            }}
                            class={[
                                styles.text_wrapper,
                                { [styles.highlight_word]: this.isHighlightWord(word.id), "ps-2": false }
                            ]}
                            onInit={this.onInitTooltip(word)}
                            data-word-position={word.position}
                            data-word-location={word.location}
                            data-word-type={word.char_type_name}
                            onmouseover={() => this.onMouseOver(word)}
                            onmouseleave={() => this.onMouseLeave(word)}
                        >
                            <div class={["fs-arabic-auto text-center", {
                                "font-uthmanic": word.char_type_name == "end",
                                "font-arabic-auto": word.char_type_name == "word"
                            }]}>
                                {word.text_uthmani}
                            </div>
                        </Tooltip>
                    )))}
                </span>
            </>
        );
    }
});
