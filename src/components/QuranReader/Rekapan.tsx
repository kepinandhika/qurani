import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive, watch, } from "vue";
import { useChapters } from "@/hooks/chapters";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import toast from "@/lib/toast";
import { useRoute } from "vue-router";
import "./index.css"

interface MarkedError {
  word: any;
  Kesalahan: string;
  verseNumber: number;
  chapterName: string;
  isVerseError: boolean;
  page?: number;
}

export default defineComponent({
  name: "Rekapan",
  components: { vSelect },
  setup() {
    const route = useRoute();
    const chapters = useChapters();
    const markedErrors = ref<MarkedError[]>([]);
    const recapData = reactive({
      namaPenyimak: "",
      kesimpulan: "",
      catatan: "",
      namapeserta: "",
      surahDibaca: "",
      awalHalaman: "",  // Awal Halaman
      akhirHalaman: ""  // Akhir Halaman
    });
    const submissionNotification = ref("");
    const defaultPenyimak = { value: 2378, name: "Fatkul Amri" };

    // Properti untuk memilih ayat awal dan akhir
    const selectedStartVerse = ref<number>(1);
    const selectedEndVerse = ref<number>(1);

    // Properti untuk memilih surah awal dan akhir dari 114 surah
    const selectedStartSurah = ref<string>("");
    const selectedEndSurah = ref<string>("");

    onMounted(() => {
      const data = localStorage.getItem("markedErrors");
      if (data) {
        markedErrors.value = JSON.parse(data);
      }
      if (!recapData.namaPenyimak) {
        recapData.namaPenyimak = defaultPenyimak.name;
      }
      // Ambil nama peserta dari localStorage
      const participantName = localStorage.getItem("participantName") || "";
      // Jika participantName kosong, maka field peserta juga kosong
      recapData.namapeserta = participantName;

      const selectedSurahLS = localStorage.getItem("selectedSurah");
      if (selectedSurahLS) {
        recapData.surahDibaca = selectedSurahLS;
        selectedStartSurah.value = selectedSurahLS;
        selectedEndSurah.value = selectedSurahLS;
      } else if (markedErrors.value.length > 0) {
        recapData.surahDibaca = markedErrors.value[0].chapterName;
        selectedStartSurah.value = markedErrors.value[0].chapterName;
        selectedEndSurah.value = markedErrors.value[0].chapterName;
      } else if (chapters.data.value.length > 0) {
        selectedStartSurah.value = chapters.data.value[0].name_simple;
        selectedEndSurah.value = chapters.data.value[0].name_simple;
      }

      // Mengambil data dari localStorage untuk recapData

      // Jika di localStorage sudah ada nilai halaman (misalnya dari Chapter sebelumnya)
      const startPage = localStorage.getItem("startPage");
      const endPage = localStorage.getItem("endPage");
      if (startPage && endPage) {
        recapData.awalHalaman = startPage;
        recapData.akhirHalaman = endPage;
      } else {
        // Fallback jika tidak ada, gunakan query (atau kosong)
        const pageQuery = route.query.page as string;
        if (pageQuery) {
          recapData.awalHalaman = pageQuery;
          recapData.akhirHalaman = pageQuery;
        }
      }
    });



    // Watcher untuk mengupdate awal halaman saat surah awal berubah
    watch(selectedStartSurah, (newVal) => {
      const chapter = chapters.data.value.find(ch => ch.name_simple === newVal);
      if (chapter && chapter.pages && chapter.pages.length > 0) {
        // Ambil halaman pertama dari array pages
        recapData.awalHalaman = chapter.pages[0].toString();
      }
    }, { immediate: true });

    // Watcher untuk mengupdate akhir halaman saat surah akhir berubah
    watch(selectedEndSurah, (newVal) => {
      const chapter = chapters.data.value.find(ch => ch.name_simple === newVal);
      if (chapter && chapter.pages && chapter.pages.length > 0) {
        // Ambil halaman terakhir dari array pages
        recapData.akhirHalaman = chapter.pages[chapter.pages.length - 1].toString();
      }
    }, { immediate: true });

    const selectedStartChapter = computed(() => {
      return chapters.data.value.find(
        (ch) => ch.name_simple === selectedStartSurah.value
      ) || null;
    });
    const selectedEndChapter = computed(() => {
      return chapters.data.value.find(
        (ch) => ch.name_simple === selectedEndSurah.value
      ) || null;
    });

    const totalStartVerses = computed(() => {
      return selectedStartChapter.value ? selectedStartChapter.value.verses_count : 0;
    });
    const totalEndVerses = computed(() => {
      return selectedEndChapter.value ? selectedEndChapter.value.verses_count : 0;
    });

    const startVerseOptions = computed(() => {
      return Array.from({ length: totalStartVerses.value }, (_, i) => i + 1);
    });
    const endVerseOptions = computed(() => {
      return Array.from({ length: totalEndVerses.value }, (_, i) => i + 1);
    });

    watch(totalStartVerses, (newVal) => {
      if (newVal > 0) {
        selectedStartVerse.value = 1;
      }
    }, { immediate: true });
    watch(totalEndVerses, (newVal) => {
      if (newVal > 0) {
        selectedEndVerse.value = newVal;
      }
    }, { immediate: true });

    const verseErrors = computed(() => {
      return markedErrors.value
        .filter((err) => err.isVerseError)
        .map((err) => ({
          surah: err.chapterName,
          ayat: err.verseNumber,
          jenisKesalahan: err.Kesalahan
        }));
    });
    const wordErrors = computed(() => {
      const errorsByType: Record<string, { count: number; words: string[] }> = {};
      markedErrors.value.forEach((err) => {
        if (!err.isVerseError && err.word) {
          if (!errorsByType[err.Kesalahan]) {
            errorsByType[err.Kesalahan] = { count: 0, words: [] };
          }
          errorsByType[err.Kesalahan].count += 1;
          errorsByType[err.Kesalahan].words.push(err.word.text_uthmani);
        }
      });
      return errorsByType;
    });


    const getErrorColor = (error: string): string => {
      const colorMap: Record<string, string> = {
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
      return colorMap[error] || "#6c757d";
    };

    function submitRecap() {
      // Validasi kesimpulan dan catatan
      if (!recapData.kesimpulan) {
        toast.error("Pilih Kesimpulan");
        return; // Berhenti jika kesimpulan belum diisi
      }

      // if (!recapData.catatan) {
      //   toast.error("Perlu menambah catatan terlebih dahulu");
      //   return; // Berhenti jika catatan belum diisi
      // }

      // Lanjutkan proses jika validasi berhasil
      const recapPayload = {
        Peserta: recapData.namapeserta,
        Penyimak: recapData.namaPenyimak,
        Kesimpulan: recapData.kesimpulan,
        Catatan: recapData.catatan,
        SalahAyat: verseErrors.value,
        SalahKata: wordErrors.value,
        AwalSurat: selectedStartSurah.value,
        AwalAyat: selectedStartVerse.value,
        AkhirSurat: selectedEndSurah.value,
        AkhirAyat: selectedEndVerse.value,
        KesimpulanPerHalaman: pageConclusions
      };

      console.log("Recap Data:", recapPayload);

      localStorage.setItem("recapData", JSON.stringify(recapPayload));
      toast.success("Hasil berhasil terkirim!");

      // Reset data anggota/peserta di localStorage
      localStorage.removeItem("selectedMember");

      // Delay 3 detik, lalu alihkan ke halaman rumah
      setTimeout(() => {
        router.push({ name: "home" });
      }, 3000);

      // Delay 5 detik sebelum menghapus dialog kesalahan (jika pengguna sudah meninggalkan halaman rekapan)
      setTimeout(() => {
        if (router.currentRoute.value.name !== "rekapan") {
          localStorage.removeItem("markedErrors");
          markedErrors.value = [];
        }
      }, 5000);
    }

    function goBack() {
      router.go(-1);
    }

    const surahOptions = computed(() => {
      return chapters.data.value.map((ch: any) => ch.name_simple);
    });

    // Mengelompokkan kesalahan berdasarkan nomor halaman
    const errorsByPage = computed(() => {
      const pages: Record<number, { verseErrors: MarkedError[], wordErrors: MarkedError[] }> = {};
      const startPage = parseInt(recapData.awalHalaman) || 1;
      const endPage = parseInt(recapData.akhirHalaman) || 1;

      // Inisialisasi untuk setiap halaman dalam rentang
      for (let page = startPage; page <= endPage; page++) {
        pages[page] = { verseErrors: [], wordErrors: [] };
      }

      markedErrors.value.forEach(err => {
        // Jika err memiliki properti page, gunakan itu; jika tidak, hitung dengan getVersePage
        const page = err.page || (err.word?.page_number ? err.word.page_number : getVersePage(err.chapterName, err.verseNumber));
        if (page >= startPage && page <= endPage) {
          if (err.isVerseError) {
            pages[page].verseErrors.push(err);
          } else {
            pages[page].wordErrors.push(err);
          }
        }
      });

      return pages;
    });


    // Fungsi untuk menghitung halaman ayat bila data tidak tersedia di word
    const getVersePage = (chapterName: string, verseNumber: number): number => {
      const chapter = chapters.data.value.find(ch => ch.name_simple === chapterName);
      if (!chapter || !chapter.pages || chapter.pages.length === 0) return 0;
      const totalVerses = chapter.verses_count;
      const totalPages = chapter.pages.length;
      const pageIndex = Math.floor(((verseNumber - 1) / totalVerses) * totalPages);
      return chapter.pages[Math.min(pageIndex, totalPages - 1)];
    };

    // const getVersePage = (chapterName: string, verseNumber: number): number => {
    //   const chapter = chapters.data.value.find(ch => ch.name_simple === chapterName);
    //   if (!chapter || !chapter.pages || chapter.pages.length === 0) return 0;

    //   // Ini contoh sederhana - Anda mungkin perlu mapping yang lebih akurat
    //   // antara ayat dan halaman
    //   return chapter.pages[0]; // Mengembalikan halaman pertama surah
    // };
    const pageConclusions = reactive<Record<string, string>>({});
    const pageNotes = reactive<Record<string, string>>({});
    const panels = ref<Record<string, boolean>>({});

    // Fungsi untuk menyimpan data ke local storage
    const saveToLocalStorage = () => {
      localStorage.setItem('pageConclusions', JSON.stringify(pageConclusions));
      localStorage.setItem('pageNotes', JSON.stringify(pageNotes));
      localStorage.setItem('panels', JSON.stringify(panels.value));
    };

    // Fungsi untuk memuat data dari local storage
    const loadFromLocalStorage = () => {
      const savedConclusions = localStorage.getItem('pageConclusions');
      const savedNotes = localStorage.getItem('pageNotes');
      const savedPanels = localStorage.getItem('panels');

      if (savedConclusions) {
        Object.assign(pageConclusions, JSON.parse(savedConclusions));
      }
      if (savedNotes) {
        Object.assign(pageNotes, JSON.parse(savedNotes));
      }
      if (savedPanels) {
        panels.value = JSON.parse(savedPanels);
      }
    };

    // Memuat data saat komponen dimount
    onMounted(loadFromLocalStorage);

    // Menyimpan data saat ada perubahan
    watch(pageConclusions, saveToLocalStorage, { deep: true });
    watch(pageNotes, saveToLocalStorage, { deep: true });
    watch(panels, saveToLocalStorage, { deep: true });

    // Inisialisasi nilai default jika perlu (kode Anda yang sudah ada)
    watch(() => recapData.awalHalaman, (newVal, oldVal) => {
      const start = parseInt(newVal);
      const end = parseInt(recapData.akhirHalaman);
      for (let page = start; page <= end; page++) {
        if (!pageConclusions[page]) pageConclusions[page] = "";
        if (!pageNotes[page]) pageNotes[page] = "";
      }
    }, { immediate: true });

    watch(() => recapData.akhirHalaman, (newVal, oldVal) => {
      const start = parseInt(recapData.awalHalaman);
      const end = parseInt(newVal);
      for (let page = start; page <= end; page++) {
        if (!pageConclusions[page]) pageConclusions[page] = "";
        if (!pageNotes[page]) pageNotes[page] = "";
      }
    }, { immediate: true });

    const togglePanel = (page: string) => {
      panels.value[page] = !panels.value[page];
    };
    // Inisialisasi default state panel berdasarkan errorsByPage
    watch(errorsByPage, (newVal) => {
      Object.keys(newVal).forEach((page) => {
        if (panels.value[page] === undefined) {
          panels.value[page] = true;
        }
      });
    }, { immediate: true });
    // Di dalam setup()

    // Fungsi untuk menyimpan ke localStorage
    const savePageConclusions = () => {
      localStorage.setItem('pageConclusions', JSON.stringify(pageConclusions));
    };

    // Fungsi untuk memuat dari localStorage
    const loadPageConclusions = () => {
      const savedConclusions = localStorage.getItem('pageConclusions');
      if (savedConclusions) {
        Object.assign(pageConclusions, JSON.parse(savedConclusions));
      }
    };

    // Saat komponen dimuat, muat data dari localStorage
    onMounted(() => {
      loadPageConclusions();
    });

    // Pantau perubahan pageConclusions dan simpan ke localStorage
    watch(pageConclusions, savePageConclusions, { deep: true });

    // Pastikan inisialisasi default untuk halaman yang belum ada
    watch(
      () => [recapData.awalHalaman, recapData.akhirHalaman],
      ([awal, akhir]) => {
        const start = parseInt(awal) ;
        const end = parseInt(akhir) ;
        for (let page = start; page <= end; page++) {
          if (!pageConclusions[page]) {
            pageConclusions[page] = "";
          }
        }
      },
      { immediate: true }
    );

    return {
      recapData,
      verseErrors,
      wordErrors,
      submitRecap,
      goBack,
      getErrorColor,
      submissionNotification,
      selectedStartSurah,
      selectedStartVerse,
      totalStartVerses,
      startVerseOptions,
      selectedEndSurah,
      selectedEndVerse,
      totalEndVerses,
      endVerseOptions,
      chapters,
      surahOptions,
      markedErrors,
      getVersePage,
      errorsByPage,
      pageConclusions,
      pageNotes,
      panels,
      togglePanel
    };
  },
  render() {
    return (
      <div class="container my-4">
        <button class="btn btn-link mb-3" style="text-decoration:none;" onClick={this.goBack}>
          <i class="bi bi-arrow-left"></i> {this.$t("general.back")}
        </button>
        <h2 class="mb-4 text-center">{this.$t("general.hasilrekap")}</h2>
        {this.submissionNotification && (
          <div class="alert alert-success" role="alert">
            {this.submissionNotification}
          </div>
        )}
        <div class="card p-4 shadow-sm mb-4">
          <div class="mb-3">
            <label class="form-label">Nama Peserta</label>
            <input type="text" class="form-control" v-model={this.recapData.namapeserta} disabled />
          </div>
          <div class="d-flex gap-3 mb-3">
            <div class="flex-grow-1">
              <label class="form-label">Awal Surat:</label>
              <vSelect
                modelValue={this.selectedStartSurah}
                onUpdate:modelValue={(value: string) => (this.selectedStartSurah = value)}
                options={this.surahOptions}
                placeholder="Cari surah..."
                clearable={false}
              />
            </div>
            <div class="flex-grow-1">
              <label class="form-label">Awal Ayat:</label>
              <vSelect
                modelValue={this.selectedStartVerse}
                onUpdate:modelValue={(value: number) => (this.selectedStartVerse = value)}
                options={this.startVerseOptions}
                placeholder="Cari ayat..."
                clearable={false}
              />
            </div>
          </div>
          <div class="d-flex gap-3 mb-3">
            <div class="flex-grow-1">
              <label class="form-label">Akhir Surat:</label>
              <vSelect
                modelValue={this.selectedEndSurah}
                onUpdate:modelValue={(value: string) => (this.selectedEndSurah = value)}
                options={this.surahOptions}
                placeholder="Cari surah..."
                clearable={false}
              />
            </div>
            <div class="flex-grow-1">
              <label class="form-label">Akhir Ayat:</label>
              <vSelect
                modelValue={this.selectedEndVerse}
                onUpdate:modelValue={(value: number) => (this.selectedEndVerse = value)}
                options={this.endVerseOptions}
                placeholder="Cari ayat..."
                clearable={false}
              />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Kesimpulan</label>
            <select class="form-select" style="max-width: 200px;" v-model={this.recapData.kesimpulan}>
              <option value="" style="color: grey;">Pilih Kesimpulan</option>
              <option value="Lancar">Lancar</option>
              <option value="Tidak Lancar">Tidak Lancar</option>
              <option value="Lulus">Lulus</option>
              <option value="Tidak Lulus">Tidak Lulus</option>
              <option value="Mumtaz">Mumtaz</option>
              <option value="Dhoif">Dhoif</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Catatan</label>
            <textarea
              class="form-control"
              v-model={this.recapData.catatan}
              placeholder="Catatan"
            ></textarea>
          </div>
          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" onClick={this.submitRecap}>
              Kirim
            </button>
          </div>
        </div>
        {Object.entries(this.errorsByPage)
          .sort(([pageA], [pageB]) => parseInt(pageA) - parseInt(pageB))
          .map(([page, errors]) => (
            <div key={page} class="panel card mb-3">
              <div
                class=" panel-heading d-flex align-items-center justify-content-between"
                style={{
                  background: "#d9edf7",
                  border: "none",
                  color: "#2C3E50",
                  cursor: "pointer"
                }}
                onClick={() => this.togglePanel(page)}
              >
                <h5 class="m-0"
                  style={{

                    color: "#31708f",
                  }}

                >Halaman {page}</h5>
                <span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="34px"
                    height="34px"
                    viewBox="0 0 24 24"
                    style={{
                      transform: this.panels[page] ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s",
                      marginTop: "20px",
                      color: "#31708f"
                    }}
                  >
                    <g>
                      <path fill="none" d="M0 0h24v24H0z" />
                      <path fill="currentColor" d="M12 15l-4.243-4.243 1.415-1.414L12 12.172l2.828-2.829 1.415 1.414z" />
                    </g>
                  </svg>
                </span>
              </div>
              <div class="panel-body" v-show={this.panels[page]}>
                <div class="mb-3">
                  <h6>Kesalahan Ayat:</h6>
                  {errors.verseErrors.length === 0 ? (
                    <p class="text-muted">Tidak ada kesalahan ayat.</p>
                  ) : (
                    <ul style={{ textAlign: "left", listStyleType: "none", padding: 0 }}>
                      {errors.verseErrors.map((err, idx) => (
                        <li key={`verse-${idx}`} class="list-group-item" style={{ borderBottom: "1px solid #ddd", padding: "7px 0" }}>
                          <span style={{ fontWeight: "500", fontSize: "15px", marginRight: "5px" }}>
                            {idx + 1}.
                          </span>
                          <span>
                            {err.chapterName} : {err.verseNumber}
                          </span>
                          <span
                            class="badge ms-2"
                            style={{
                              backgroundColor: this.getErrorColor(err.Kesalahan),
                              borderWidth: "2px",
                              fontWeight: "500",
                              textAlign: "left",
                              color: "#000000",
                              fontSize: "15px"
                            }}
                          >
                            {err.Kesalahan}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div class="mb-3">
                  <h6>Kesalahan Kata:</h6>
                  {errors.wordErrors.length === 0 ? (
                    <p class="text-muted">Tidak ada kesalahan kata.</p>
                  ) : (
                    <ul style={{ textAlign: "left", listStyleType: "none", padding: 0 }}>
                      {errors.wordErrors.map((err, idx) => (
                        <li
                          key={`word-${idx}`}
                          class="list-group-item"
                          style={{
                            borderBottom: "1px solid #ddd",
                            padding: "5px 0",
                          }}
                        >
                          <span style={{ fontWeight: "500", fontSize: "15px", marginRight: "5px" }}>
                            {idx + 1}.
                          </span>
                          <span
                            class="badge me-2"
                            style={{
                              backgroundColor: this.getErrorColor(err.Kesalahan),
                              color: "#000000",
                              fontSize: "20px",
                            }}
                          >
                            {err.word.text_uthmani}
                          </span>
                          <span>{err.Kesalahan}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div class="mb-3">
                  <h6>Kesimpulan</h6>
                  <select class="form-select" style="max-width: 200px;" v-model={this.pageConclusions[page]}>
                    <option value="" style="color: grey;">Pilih Kesimpulan</option>
                    <option value="Lancar">Lancar</option>
                    <option value="Tidak Lancar">Tidak Lancar</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Tidak Lulus">Tidak Lulus</option>
                    <option value="Mumtaz">Mumtaz</option>
                    <option value="Dhoif">Dhoif</option>
                  </select>
                </div>
                <div class="mb-3">
                  <h6>Catatan</h6>
                  <textarea
                    class="form-control"
                    v-model={this.pageNotes[page]}
                    placeholder="Catatan khusus halaman ini"
                  ></textarea>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    );
  },
});