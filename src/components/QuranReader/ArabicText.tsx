import { Chapters, QuranReader, Words } from "@/types";
import { defineComponent, PropType, ref, watch, onBeforeUnmount, computed, Teleport, onMounted, VNode } from "vue";
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

// Fungsi untuk menentukan halaman berdasarkan mapping ayat
export function getPageForVerse(surah: string, verse: number): number {
  // Contoh mapping khusus untuk surah tertentu
  const pageMapping: Record<string, { start: number; end: number; page: number }[]> = {
    'Al-Baqarah': [
      { start: 1, end: 5, page: 2 },
      { start: 6, end: 16, page: 3 },
      { start: 17, end: 286, page: 4 }
    ],
    // Tambahkan mapping untuk surah lain jika ada
  };

  if (pageMapping[surah]) {
    const mapping = pageMapping[surah].find(m => verse >= m.start && verse <= m.end);
    if (mapping) return mapping.page;
  }
  // Fallback: misalnya bagi jumlah ayat dengan 15
  return Math.ceil(verse / 15);
}

interface MarkedError {
  word: Words | null; // Jika null, berarti kesalahan pada level ayat
  Kesalahan: string;
  verseNumber: number;
  chapterName: string;
  isVerseError: boolean;
}

export default defineComponent({
  props: {
    words: {
      type: Array as PropType<Words[]>,
      required: true,
    },
    chapterId: {
      type: Number,
    },
    verseNumber: {
      type: Number,
    },
    highlight: {
      type: [Number, Boolean],
      default: false,
    },
    enableHover: {
      type: Boolean,
      default: false,
    },
    showTooltipWhenHighlight: {
      type: Boolean,
      default: false,
    },
    showTransliterationInline: {
      type: Boolean,
      default: false,
    },
    showTranslationInline: {
      type: Boolean,
      default: false,
    },
    showTransliterationTooltip: {
      type: Boolean,
      default: false,
    },
    showTranslationTooltip: {
      type: Boolean,
      default: false,
    },
    buttons: {
      type: Array as PropType<QuranReader["PROPS_BUTTON"]>,
      default: () => [],
    },
  },
  setup(props) {
    const { t } = useI18n();
    const chapters = useChapters();
    const settings = useSettings();
    const { fontType } = settings;

    // Tooltip dan popover Bootstrap
    const tooltipInstance = ref<Record<number, BSTooltip>>({});
    const popoverInstance = ref<Record<number, BSPopover>>({});
    const popover = ref<BSPopover | null>(null);
    const refs = ref<{ popoverContent: HTMLElement | null }>({ popoverContent: null });

    // State hover dan modal
    const isHover = ref<boolean>(false);
    const isModalVisible = ref<boolean>(false);
    const modalContent = ref<string>("");

    // State koreksi kesalahan
    const correctionTarget = ref<'ayat' | 'kata'>('kata');
    const selectedWord = ref<Words | null>(null);
    const markedErrors = ref<MarkedError[]>([]);

    // Contoh computed key untuk ayat (misal: "2:255")
    const verseKey = computed<string>(() => {
      return [props.chapterId, props.verseNumber].filter(v => v !== undefined).join(":");
    });

    // Dapatkan data chapter berdasarkan chapterId
    const chapter = computed(() => {
      return props.chapterId ? chapters.data.value.find(ch => ch.id === props.chapterId) : null;
    });

    // Gabungan teks Uthmani
    const textUthmani = computed(() => {
      return props.words.map(word => word.text_uthmani).join(" ");
    });

    // Tombol tambahan
    const shouldUseButton = computed(() => {
      return props.buttons.length > 0 && props.chapterId !== undefined && props.verseNumber !== undefined;
    });

    // --- Perhitungan halaman berdasarkan ayat ---
    // Computed untuk menentukan halaman saat ini berdasarkan mapping
    const currentPage = computed(() => {
      if (props.chapterId && props.verseNumber) {
        const currentChapter = chapters.data.value.find(ch => ch.id === props.chapterId);
        if (currentChapter) {
          return getPageForVerse(currentChapter.name_simple, props.verseNumber);
        }
      }
      return 0;
    });

    // Simpan halaman saat ini ke localStorage (atau gunakan sesuai kebutuhan)
    onMounted(() => {
      localStorage.setItem("currentPage", currentPage.value.toString());
    });
    // --- End Perhitungan halaman ---

    // Fungsi dan state lainnya (tooltip, modal, markError, dll) tetap sama...
    // ... (kode untuk tooltipInstance, popoverInstance, showWrongWordModal, getWordStyle, dll)

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
        Object.keys(popoverInstance.value).forEach((k) =>
          Number(k) !== key && popoverInstance.value[Number(k)]?.hide()
        );
        popoverInstance.value[key]?.toggle();
        setTimeout(() => tooltipInstance.value[key]?.hide(), 100);
      };
    }

    function showWrongWordModal(word: Words, isVerseEnd = false) {
      const isAlreadyMarked = markedErrors.value.some((err) =>
        (isVerseEnd && err.verseNumber === props.verseNumber) ||
        (!isVerseEnd && err.word?.id === word.id)
      );

      if (isAlreadyMarked) {
        correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
        modalContent.value = isVerseEnd
          ? `Hapus tanda pada ayat ${props.verseNumber}`
          : `Hapus tanda pada kata "${word.text_uthmani}"`;
        isModalVisible.value = true;
      } else {
        correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
        modalContent.value = isVerseEnd
          ? `Surat ${chapter.value?.name_simple} Ayat ke ${props.verseNumber}`
          : `Kata ${word.text_uthmani}`;
        isModalVisible.value = true;
      }
      selectedWord.value = word;
    }

    function getWordStyle(word: Words) {
      const error = markedErrors.value.find(err =>
        (err.isVerseError && err.verseNumber === props.verseNumber) ||
        (!err.isVerseError && err.word?.id === word.id)
      );
      if (error && error.Kesalahan in errorColors && !error.isVerseError) {
        return { backgroundColor: errorColors[error.Kesalahan] };
      }
      return {};
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    function markError(word: Words | null, Kesalahan: string, isVerseError: boolean = false) {
      if (word || isVerseError) {
        markedErrors.value.push({
          word,
          Kesalahan,
          verseNumber: props.verseNumber!,
          chapterName: chapter.value?.name_simple || '',
          isVerseError,
        });
        localStorage.setItem('markedErrors', JSON.stringify(markedErrors.value));
        closeModal();
      }
    }

    function removeMarkedError(word: Words | null, isVerseError: boolean = false) {
      if (isVerseError) {
        markedErrors.value = markedErrors.value.filter(err =>
          err.verseNumber !== props.verseNumber || !err.isVerseError
        );
      } else if (word) {
        markedErrors.value = markedErrors.value.filter(err =>
          err.word?.id !== word.id
        );
      }
      localStorage.setItem('markedErrors', JSON.stringify(markedErrors.value));
      closeModal();
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
        return <>{children}</>;
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
              default: () => children,
            }}
          </Popover>
        );
      }
    }

    function selectWord(position: number) {
      selectedWord.value = props.words.find(word => word.position === position) || null;
    }

    function autoRefresh() {
      const savedErrors = localStorage.getItem('markedErrors');
      if (savedErrors) {
        markedErrors.value = JSON.parse(savedErrors);
      }
    }
    let autoRefreshTimer: number;
    onMounted(() => {
      const savedErrors = localStorage.getItem('markedErrors');
      if (savedErrors) {
        markedErrors.value = JSON.parse(savedErrors);
      }
      window.addEventListener("keydown", handleKeydown);
      autoRefreshTimer = window.setInterval(autoRefresh, 1000);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener("keydown", handleKeydown);
      if (autoRefreshTimer) {
        window.clearInterval(autoRefreshTimer);
      }
      isHover.value = false;
      Object.keys(tooltipInstance.value).forEach(key =>
        tooltipInstance.value[Number(key)]?.hide()
      );
      Object.keys(popoverInstance.value).forEach(key =>
        popoverInstance.value[Number(key)]?.hide()
      );
    });
    
    watch(() => props.highlight, (value, oldValue) => {
      if (!props.showTooltipWhenHighlight) return;
      if (typeof value === "number") tooltipInstance.value[value]?.show();
      if (typeof oldValue === "number") tooltipInstance.value[oldValue]?.hide();
    });
    
    watch(() => props.showTooltipWhenHighlight, (value) => {
      if (typeof props.highlight === "number") {
        tooltipInstance.value[props.highlight]?.[value ? "show" : "hide"]();
      }
    });
    
    // Warna background untuk tiap tipe kesalahan
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
    };

    function getVerseErrorStyle() {
      const verseError = markedErrors.value.find(err =>
        err.isVerseError && err.verseNumber === props.verseNumber
      );
      if (verseError && verseError.Kesalahan in errorColors) {
        if (fontType.value === "Default") {
          return {
            backgroundColor: errorColors[verseError.Kesalahan],
            padding: '26px 1px 14px 1px',
          };
        } else if (fontType.value === "Uthmanic") {
          return {
            backgroundColor: errorColors[verseError.Kesalahan],
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
      currentPage, // halaman untuk ayat ini
      autoRefresh,
      goBack: () => router.go(-1)
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
              <div class="modal-dialog modal-dialog-centered" onClick={(e: MouseEvent) => e.stopPropagation()}>
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">{this.modalContent}</h5>
                    <button type="button" class="btn-close" onClick={this.closeModal}></button>
                  </div>
                  <div class="modal-body">
                    {this.markedErrors.some((err) =>
                      (this.correctionTarget === 'ayat' && err.verseNumber === this.verseNumber) ||
                      (this.correctionTarget === 'kata' && err.word?.id === this.selectedWord?.id)
                    ) ? (
                      <button 
                        class="w-100 mb-2 btn btn-danger" 
                        onClick={() => this.removeMarkedError(this.selectedWord, this.correctionTarget === 'ayat')}
                      >
                        Hapus Tanda
                      </button>
                    ) : (
                      this.correctionTarget === 'kata' ? (
                        <>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Gharib')} style={{ backgroundColor: "#CCCCCC", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Gharib</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Ghunnah')} style={{ backgroundColor: "#99CCFF", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Ghunnah</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Harokat Tertukar')} style={{ backgroundColor: "#DFF18F", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Harokat Tertukar</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Huruf Tambah/Kurang')} style={{ backgroundColor: "#F4ACB6", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Huruf Tambah/Kurang</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lupa (tidak dibaca)')} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Lupa (tidak dibaca)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Mad (panjang pendek)')} style={{ backgroundColor: "#FFCC99", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Mad (panjang pendek)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Makhroj (pengucapan huruf)')} style={{ backgroundColor: "#F4A384", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Makhroj (pengucapan huruf)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Nun Mati dan Tanwin')} style={{ backgroundColor: "#F8DD74", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Nun Mati dan Tanwin</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Qalqalah (memantul)')} style={{ backgroundColor: "#D5B6D4", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Qalqalah (memantul)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Tasydid (penekanan)')} style={{ backgroundColor: "#B5C9DF", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Tasydid (penekanan)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Urutan Huruf atau Kata')} style={{ backgroundColor: "#FE7D8F", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Urutan Huruf atau Kata</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof atau Washol (berhenti atau lanjut)')} style={{ backgroundColor: "#A1D4CF", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Waqof atau Washol (berhenti atau lanjut)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Waqof dan Ibtida (berhenti dan memulai)')} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Waqof dan Ibtida (berhenti dan memulai)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(this.selectedWord, 'Lainnya')} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Lainnya</button>
                        </>
                      ) : (
                        <>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Lupa (tidak dibaca)', true)} style={{ backgroundColor: "#FA7656", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Ayat Lupa (tidak dibaca)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Waqof atau Washol (berhenti atau lanjut)', true)} style={{ backgroundColor: "#FE7D8F", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Ayat Waqof atau Washol (berhenti atau lanjut)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Ayat Waqof dan Ibtida (berhenti dan memulai)', true)} style={{ backgroundColor: "#90CBAA", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Ayat Waqof dan Ibtida (berhenti dan memulai)</button>
                          <button class="w-100 mb-2 btn" onClick={() => this.markError(null, 'Lainnya', true)} style={{ backgroundColor: "#CC99CC", borderWidth: "2px", fontWeight: "500", textAlign: "left", color: "#000000" }}>Lainnya</button>
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
                  <ButtonCopy text={this.textUthmani} />
                )}
                {this.buttons.includes("Tafsir") && (
                  <ButtonTafsir chapterId={this.chapterId!} verseNumber={this.verseNumber!} />
                )}
                {this.buttons.includes("Play") && (
                  <ButtonPlay chapterId={this.chapterId!} verseNumber={this.verseNumber!} />
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
                delay: { show: 500, hide: 2000 },
              }}
              class={[
                styles.text_wrapper,
                { [styles.highlight_word]: this.isHighlightWord(word.position), "ps-2": this.showTransliterationInline }
              ]}
              {...{
                "data-word-position": word.position,
                "data-word-location": word.location,
                "data-word-type": word.char_type_name,
                "onclick": () => {
                  this.showWrongWordModal(word, word.char_type_name == "end");
                  this.selectedWord = word;
                }
              }}
            >
              <div
                class={[
                  "fs-arabic-auto",
                  "text-center",
                  { "font-uthmanic": word.char_type_name == "end", "font-arabic-auto": word.char_type_name == "word" }
                ]}
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
  },
});
