import { Chapters, QuranReader, Words } from "@/types";
import { defineComponent, PropType, ref, watch, onBeforeUnmount, VNode, computed, Teleport, onMounted, h, nextTick } from "vue";
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

// Interface untuk data kesalahan yang ditandai
interface MarkedError {
  word: Words | null; // Jika null, berarti kesalahan pada level ayat
  Kesalahan: string;
  verseNumber: number;
  chapterName: string;
  isVerseError: boolean; // Menandakan apakah kesalahan terjadi pada level ayat
  page?: number; // Nomor halaman (diambil dari word.page_number)
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
    // Inisialisasi i18n dan hooks
    const { t } = useI18n();
    const chapters = useChapters();
    const settings = useSettings();
    const { fontType } = settings;

    // Instance tooltip dan popover untuk Bootstrap
    const tooltipInstance = ref<Record<number, BSTooltip>>({});
    const popoverInstance = ref<Record<number, BSPopover>>({});
    const popover = ref<BSPopover | null>(null);

    // State untuk hover dan modal
    const isHover = ref<boolean>(false);
    const isModalVisible = ref<boolean>(false);
    const modalContent = ref<string>("");

    // Ref untuk element konten popover
    const refs = ref<{ popoverContent: HTMLElement | null }>({ popoverContent: null });

    // Computed key untuk ayat (contoh: "2:255")
    const verseKey = computed<string>(() => {
      return [props.chapterId, props.verseNumber].filter((v) => v !== undefined).join(":");
    });

    // Mendapatkan data chapter dari hook
    const chapter = computed<Chapters | null>(() => {
      return props.chapterId ? chapters.find(props.chapterId) : null;
    });

    // Teks Uthmani gabungan untuk ayat
    const textUthmani = computed<string>(() => {
      return props.words.map((word) => word.text_uthmani).join(" ");
    });

    // Menentukan apakah tombol tambahan (Bookmark, Copy, dsb) akan ditampilkan
    const shouldUseButton = computed<boolean>(() => {
      return props.buttons.length > 0 && props.chapterId !== undefined && props.verseNumber !== undefined;
    });

    // State untuk menentukan target penandaan: 'ayat' atau 'kata'
    const correctionTarget = ref<'ayat' | 'kata'>('kata');
    // Kata yang dipilih berdasarkan id (unik) sehingga jika ada kata dengan teks sama, hanya satu yang terpengaruh
    const selectedWord = ref<Words | null>(null);
    // Array untuk menyimpan data kesalahan yang ditandai
    const markedErrors = ref<MarkedError[]>([]);

    // Warna background untuk tiap tipe kesalahan (default mapping)
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

    // Tambahkan ref untuk selectedUser dan selectedGroup (diambil dari localStorage)
    const selectedUser = ref<any>(null);
    const selectedGroup = ref<any>(null);
    onMounted(() => {
      const savedUser = localStorage.getItem("selectedUser");
      if (savedUser) {
        try {
          selectedUser.value = JSON.parse(savedUser);
        } catch (e) {
          selectedUser.value = null;
        }
      }
      const savedGroup = localStorage.getItem("selectedGroup");
      if (savedGroup) {
        try {
          selectedGroup.value = JSON.parse(savedGroup);
        } catch (e) {
          selectedGroup.value = null;
        }
      }
    });

    // Computed untuk mengambil label error yang tersedia berdasarkan setting user, grup, atau global
    const availableErrorLabels = computed(() => {
      let settingsKey = "";
      if (selectedUser.value) {
        // Gunakan kunci untuk user tanpa penambahan id
        settingsKey = "qurani_setting_user";
      } else if (selectedGroup.value) {
        // Gunakan kunci untuk grup, tambahkan id grup jika tersedia
        settingsKey = "qurani_setting_grup_" + selectedGroup.value.id;
      } else {
        settingsKey = "qurani_setting_global";
      }
      const stored = localStorage.getItem(settingsKey);
      if (!stored) return [];
      try {
        const parsed = JSON.parse(stored);
        const checked = parsed.checkedErrors || {};
        // Kembalikan array label yang diset true
        return Object.keys(checked).filter(label => checked[label] === true);
      } catch (e) {
        return [];
      }
    });
    

    // Pisahkan label error untuk kata (tidak diawali "Ayat") dan untuk ayat (diawali "Ayat")
    const availableWordErrorLabels = computed(() =>
      availableErrorLabels.value.filter(label => !label.startsWith("Ayat"))
    );
    const availableVerseErrorLabels = computed(() =>
      availableErrorLabels.value.filter(label => label.startsWith("Ayat"))
    );

    // Fungsi untuk menentukan apakah kata yang berada pada posisi tertentu di-highlight
    function isHighlightWord(position: number) {
      return (props.highlight === position);
    }

    // Fungsi inisialisasi popover
    function onInitPopover(key: number) {
      return function (popover: BSPopover) {
        popoverInstance.value[key] = popover;
      };
    }

    // Fungsi untuk menangani klik dan tahan (click hold) pada tombol
    function onClickHold(key: number) {
      return function () {
        Object.keys(popoverInstance.value).forEach((keys) =>
          Number(keys) !== key && popoverInstance.value[Number(keys)]?.hide()
        );
        popoverInstance.value[key]?.toggle();
        setTimeout(() => tooltipInstance.value[key]?.hide(), 100);
      };
    }

    // Fungsi untuk menampilkan modal ketika kata ditekan
    function showWrongWordModal(word: Words, isVerseEnd = false) {
      const isAlreadyMarked = markedErrors.value.some((err) =>
        (isVerseEnd && err.verseNumber === props.verseNumber) ||
        (!isVerseEnd && err.word?.id === word.id)
      );

      if (isAlreadyMarked) {
        // Jika sudah ditandai, tampilkan opsi "Hapus Tanda"
        correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
        modalContent.value = isVerseEnd
          ? `Hapus tanda pada ayat ${props.verseNumber}`
          : `Hapus tanda pada kata "${word.text_uthmani}"`;
        isModalVisible.value = true;
      } else {
        // Jika belum ditandai, tampilkan opsi untuk menambahkan tanda
        correctionTarget.value = isVerseEnd ? 'ayat' : 'kata';
        modalContent.value = isVerseEnd
          ? `Surat ${chapter.value?.name_simple} Ayat ke ${props.verseNumber}`
          : `Kata ${word.text_uthmani}`;
        isModalVisible.value = true;
      }
      selectedWord.value = word;
    }

    // Fungsi untuk mendapatkan gaya (style) untuk sebuah kata
    function getWordStyle(word: Words) {
      const error = markedErrors.value.find((err) =>
        (err.isVerseError && err.verseNumber === props.verseNumber) ||
        (!err.isVerseError && err.word?.id === word.id)
      );
      if (error && error.Kesalahan in errorColors && !error.isVerseError) {
        return { backgroundColor: errorColors[error.Kesalahan] };
      }
      return {};
    }

    // Fungsi untuk menangani event keydown, khususnya tombol Escape untuk menutup modal
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    // Fungsi untuk menandai kesalahan
    function markError(word: Words | null, Kesalahan: string, isVerseError: boolean = false) {
      let pageNumber: number | undefined;
      let sanitizedWord: Words | null = null;
      
      if (word) {
        const tempWord = { ...word } as Partial<Words>;
        delete tempWord.audio_url;
        delete tempWord.position;
        delete tempWord.location;
        delete tempWord.line_number;
        delete tempWord.translation;
        delete tempWord.transliteration;
        sanitizedWord = tempWord as Words;
        pageNumber = word.page_number;
      } else if (isVerseError) {
        pageNumber = props.words.length > 0 ? props.words[0].page_number : 0;
      }
    
      if (sanitizedWord || isVerseError) {
        markedErrors.value.push({
          word: sanitizedWord,
          Kesalahan,
          verseNumber: props.verseNumber!,
          chapterName: chapter.value?.name_simple || '',
          isVerseError,
          page: pageNumber,
        });
        saveMarkedErrors();
        closeModal();
      }
    }

    // Fungsi untuk menghapus tanda kesalahan
    function removeMarkedError(word: Words | null, isVerseError: boolean = false) {
      if (isVerseError) {
        markedErrors.value = markedErrors.value.filter((err) =>
          err.verseNumber !== props.verseNumber || !err.isVerseError
        );
      } else if (word) {
        markedErrors.value = markedErrors.value.filter((err) =>
          err.word?.id !== word.id
        );
      }
      saveMarkedErrors();
      closeModal();
    }

    // Fungsi untuk menyimpan data kesalahan ke localStorage
    function saveMarkedErrors() {
      try {
        localStorage.setItem('markedErrors', JSON.stringify(markedErrors.value));
      } catch (error) {
        // Tangani error jika terjadi kegagalan penyimpanan
      }
    }

    // Fungsi untuk menutup modal
    function closeModal() {
      isModalVisible.value = false;
    }

    // Fungsi untuk menampilkan tooltip saat mouse over
    function onMouseOver(key: number) {
      isHover.value = true;
      if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
        tooltipInstance.value[key]?.show();
      }
    }

    // Fungsi untuk menyembunyikan tooltip saat mouse leave
    function onMouseLeave(key: number) {
      isHover.value = false;
      if (!props.showTooltipWhenHighlight || !isHighlightWord(key)) {
        tooltipInstance.value[key]?.hide();
      }
    }

    // Fungsi pembungkus untuk kata, mengaplikasikan Popover jika tombol tambahan diaktifkan
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

    // Fungsi untuk memilih kata berdasarkan posisinya
    function selectWord(position: number) {
      selectedWord.value = props.words.find((word) => word.position === position) || null;
    }

    // Fungsi auto refresh: mengambil ulang data markedErrors dari localStorage
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
      Object.keys(tooltipInstance.value).forEach((key) =>
        tooltipInstance.value[Number(key)]?.hide()
      );
      Object.keys(popoverInstance.value).forEach((key) =>
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
    
    function getVerseErrorStyle() {
      const verseError = markedErrors.value.find((err) =>
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
      t,
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
      handleVerseClick: () => {
        if (props.chapterId && props.verseNumber) {
          modalContent.value = `Anda mengklik seluruh ayat ${props.verseNumber} dari surat ${props.chapterId}`;
          isModalVisible.value = true;
        }
      },
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
      availableWordErrorLabels,
      availableVerseErrorLabels,
      selectedUser,
      selectedGroup,
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
                          {this.availableWordErrorLabels.map((label: string) => (
                            <button
                              key={label}
                              class="w-100 mb-2 btn"
                              onClick={() => this.markError(this.selectedWord, label)}
                              style={{
                                backgroundColor: this.errorColors[label] || "#CCCCCC",
                                borderWidth: "2px",
                                fontWeight: "500",
                                textAlign: "left",
                                color: "#000000"
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {this.availableVerseErrorLabels.map((label: string) => (
                            <button
                              key={label}
                              class="w-100 mb-2 btn"
                              onClick={() => this.markError(null, label, true)}
                              style={{
                                backgroundColor: this.errorColors[label] || "#CCCCCC",
                                borderWidth: "2px",
                                fontWeight: "500",
                                textAlign: "left",
                                color: "#000000"
                              }}
                            >
                              {label}
                            </button>
                          ))}
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
          {this.words.map((word: Words) => this.wordWrapper(word, (
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
                {[word.text_uthmani]}
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
