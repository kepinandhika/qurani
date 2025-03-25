import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive, watch } from "vue";
import { useChapters } from "@/hooks/chapters";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import toast from "@/lib/toast";
import { useRoute } from "vue-router";

interface MarkedError {
  word: any;
  Kesalahan: string;
  verseNumber: number;
  chapterName: string;
  isVerseError: boolean;
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
        AkhirAyat: selectedEndVerse.value
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
    const errorsByPage = computed(() => {
      const pages: Record<number, { verseErrors: MarkedError[]; wordErrors: MarkedError[] }> = {};

      // Pastikan kita memproses semua halaman dalam range
      const startPage = parseInt(recapData.awalHalaman);
      const endPage = parseInt(recapData.akhirHalaman);

      // Inisialisasi semua halaman dalam range terlebih dahulu
      for (let page = startPage; page <= endPage; page++) {
        pages[page] = { verseErrors: [], wordErrors: [] };
      }

      // Isi dengan data error yang ada
      markedErrors.value.forEach(err => {
        const page = err.word?.page || getVersePage(err.chapterName, err.verseNumber);

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

    const getVersePage = (chapterName: string, verseNumber: number): number => {
      const chapter = chapters.data.value.find(ch => ch.name_simple === chapterName);
      if (!chapter || !chapter.pages || chapter.pages.length === 0) return 0;

      // Ini contoh sederhana - Anda mungkin perlu mapping yang lebih akurat
      // antara ayat dan halaman
      return chapter.pages[0]; // Mengembalikan halaman pertama surah
    };

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
      errorsByPage
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

        {/* Form Rekap */}
        <div class="card p-4 shadow-sm mb-4">
          <div class="mb-3">
            <label class="form-label">Nama Peserta</label>
            <input type="text" class="form-control" v-model={this.recapData.namapeserta} disabled />
          </div>

          {/* Awal Surat & Ayat dengan pencarian */}
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

          {/* Akhir Surat & Ayat dengan pencarian */}
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

          {/* Tambahan: Awal Halaman & Akhir Halaman */}
          <div class="d-flex gap-3 mb-3">
            <div class="flex-grow-1">
              <label class="form-label">Awal Halaman:</label>
              <input
                type="text"
                class="form-control"
                v-model={this.recapData.awalHalaman}
                readonly
                placeholder="Awal Halaman"
              />
            </div>
            <div class="flex-grow-1">
              <label class="form-label">Akhir Halaman:</label>
              <input
                type="text"
                class="form-control"
                v-model={this.recapData.akhirHalaman}
                readonly
                placeholder="Akhir Halaman"
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

        {/* Kesalahan  */}
        <div class="card p-4 shadow-sm mb-4">
          {/* Daftar Halaman */}
          {Object.entries(this.errorsByPage)
            .sort(([pageA], [pageB]) => parseInt(pageA) - parseInt(pageB))
            .map(([page, errors]) => (
              <div key={page} class="card p-4 shadow-sm mb-3">
                <div class="card shadow-sm mb-4" style={{
                  border: "none",
                  borderRadius: "12px",
                  overflow: "hidden"
                }}>
                  <div class="card-header p-3 text-center" style={{
                    background: "linear-gradient(135deg,rgb(162, 240, 223), rgb(40, 167, 161))",
                    border: "none",
                    color: "#2C3E50",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    textShadow: "0 1px 2px rgba(255,255,255,0.3)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    <div class="d-flex justify-content-center align-items-center">
                      <i class="bi bi-exclamation-triangle-fill me-2"></i>
                      <span>Kesalahan Halaman {page}</span>
                    </div>
                  </div>
                </div>


                {/* Kesalahan Ayat untuk halaman ini */}
                <div class="mb-3">
                  <h6>Kesalahan Ayat:</h6>
                  {errors.verseErrors.length === 0 ? (
                    <p class="text-muted">Tidak ada kesalahan ayat.</p>
                  ) : (
                    <ul class="list-group">
                      {errors.verseErrors.map((err, idx) => (
                        <li key={`verse-${idx}`} class="list-group-item">
                          <strong>
                            {err.chapterName}, Ayat {err.verseNumber}:
                          </strong>
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

                {/* Kesalahan Kata untuk halaman ini */}
                <div>
                  <h6>Kesalahan Kata:</h6>
                  {errors.wordErrors.length === 0 ? (
                    <p class="text-muted">Tidak ada kesalahan kata.</p>
                  ) : (
                    <ul class="list-group">
                      {errors.wordErrors.map((err, idx) => (
                        <li key={`word-${idx}`} class="list-group-item">
                          <span
                            class="badge me-2"
                            style={{
                              backgroundColor: this.getErrorColor(err.Kesalahan),
                              color: "#000000",
                              fontSize: "20px"
                            }}
                          >
                            {err.word.text_uthmani}
                          </span>
                          <strong>{err.Kesalahan}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    );
  },
});