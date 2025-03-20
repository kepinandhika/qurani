import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive, watch } from "vue";
import { useChapters } from "@/hooks/chapters";

interface MarkedError {
  word: any;
  Kesalahan: string;
  verseNumber: number;
  chapterName: string;
  isVerseError: boolean;
}

export default defineComponent({
  name: "Rekapan",
  setup() {
    const chapters = useChapters();
    const markedErrors = ref<MarkedError[]>([]);
    const recapData = reactive({
      namaPenyimak: "",
      kesimpulan: "",
      catatan: "",
      namapeserta: "",
      surahDibaca: ""
    });
    const submissionNotification = ref("");
    const defaultPenyimak = { value: 2378, name: "Fatkul Amri" };

    // Properti untuk memilih ayat awal dan akhir
    const selectedStartVerse = ref<number>(1);
    const selectedEndVerse = ref<number>(1);

    onMounted(() => {
      const data = localStorage.getItem("markedErrors");
      if (data) {
        markedErrors.value = JSON.parse(data);
      }
      if (!recapData.namaPenyimak) {
        recapData.namaPenyimak = defaultPenyimak.name;
      }
      const participantName = localStorage.getItem("participantName");
      if (participantName) {
        recapData.namapeserta = participantName;
      }
      // Ambil nama surah dari localStorage jika tersedia (misalnya disimpan dari index.tsx)
      const selectedSurah = localStorage.getItem("selectedSurah");
      if (selectedSurah) {
        recapData.surahDibaca = selectedSurah;
      } else if (markedErrors.value.length > 0) {
        // Jika tidak ada, ambil dari data error pertama sebagai fallback
        recapData.surahDibaca = markedErrors.value[0].chapterName;
      }
    });

    // Cari data surah berdasarkan nama yang tersimpan di recapData.surahDibaca
    const selectedChapter = computed(() => {
      if (recapData.surahDibaca) {
        return chapters.data.value.find((ch) => ch.name_simple === recapData.surahDibaca) || null;
      }
      return null;
    });

    // Total ayat dari surah yang dipilih
    const totalVerses = computed(() => {
      return selectedChapter.value ? selectedChapter.value.verses_count : 0;
    });

    // Jika totalVerses berubah dan sudah tersedia, set default:
    // Ayat awal = 1 dan Ayat akhir = totalVerses (ayat terakhir)
    watch(totalVerses, (newVal) => {
      if (newVal > 0) {
        selectedStartVerse.value = 1;
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
    const wordErrorCounts = computed(() => {
      const counts: Record<string, number> = {};
      markedErrors.value.forEach((err) => {
        if (!err.isVerseError) {
          counts[err.Kesalahan] = (counts[err.Kesalahan] || 0) + 1;
        }
      });
      return counts;
    });

    function getErrorColor(error: string): string {
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
        'LainNya': '#CC99CC',
      };
      return colorMap[error] || "#6c757d";
    }

    function submitRecap() {
      const recapPayload = {
        namaPenyimak: recapData.namaPenyimak,
        kesimpulan: recapData.kesimpulan,
        catatan: recapData.catatan,
        verseErrors: verseErrors.value,
        wordErrorCounts: wordErrorCounts.value,
        // Sertakan informasi ayat yang dipilih
        startVerse: selectedStartVerse.value,
        endVerse: selectedEndVerse.value
      };
      localStorage.setItem("recapData", JSON.stringify(recapPayload));
      submissionNotification.value = "Recap berhasil terkirim!";
    }

    function goBack() {
      localStorage.removeItem("markedErrors");
      markedErrors.value = [];
      router.go(-1);
    }

    return {
      recapData,
      verseErrors,
      wordErrorCounts,
      submitRecap,
      goBack,
      getErrorColor,
      submissionNotification,
      selectedStartVerse,
      selectedEndVerse,
      totalVerses
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
          <div class="mb-3">
            <label class="form-label">Nama Penyimak</label>
            <input type="text" class="form-control" v-model={this.recapData.namaPenyimak} disabled />
          </div>
          <div class="d-flex gap-3 mb-3">
            <div class="flex-grow-1">
              <label class="form-label">Awal Surat:</label>
              <div class="card bg-white text-black p-2">
                <span>{this.recapData.surahDibaca}</span>
              </div>
            </div>
            <div class="flex-grow-1">
              <label class="form-label">Ayat:</label>
              <select class="form-select" v-model={this.selectedStartVerse}>
                {Array.from({ length: this.totalVerses }, (_, i) => (
                  <option value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div class="flex-grow-1">
              <label class="form-label">Sampai:</label>
              <select class="form-select" v-model={this.selectedEndVerse}>
                {Array.from({ length: this.totalVerses }, (_, i) => {
                  const verseNumber = i + 1;
                  const label = verseNumber === this.totalVerses
                    ? `${verseNumber}`
                    : `${verseNumber}`;
                  return <option value={verseNumber}>{label}</option>;
                })}
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Kesimpulan</label>
            <select class="form-select" v-model={this.recapData.kesimpulan}>
              <option value="" style="color: grey;">Pilih Kesimpulan</option>
              <option value="Lancar">Lancar</option>
//               <option value="Tidak Lancar">Tidak Lancar</option>
//               <option value="Lulus">Lulus</option>
//               <option value="Tidak Lulus">Tidak Lulus</option>
//               <option value="Mumtaz">Mumtaz</option>
//               <option value="Dhoif">Dhoif</option>

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

        {/* Kesalahan Ayat */}
        <div class="card p-4 shadow-sm mb-3">
          <h5>Kesalahan Ayat</h5>
          {this.verseErrors.length === 0 ? (
            <p class="text-muted">Tidak ada kesalahan ayat.</p>
          ) : (
            <ul class="list-group">
              {this.verseErrors.map((err, index) => (
                <li key={index} class="list-group-item">
                  <strong>
                    Surah {err.surah}, Ayat {err.ayat}
                  </strong>
                  <br />
                  Kesalahan :{" "}
                  <span
                    class="badge"
                    style={{
                      backgroundColor: this.getErrorColor(err.jenisKesalahan),
                      borderWidth: "2px",
                      fontWeight: "500",
                      textAlign: "left",
                      color: "#000000"
                    }}
                  >
                    {err.jenisKesalahan}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Kesalahan Kata */}
        <div class="card p-4 shadow-sm">
          <h5>Kesalahan Kata</h5>
          {Object.entries(this.wordErrorCounts).length > 0 ? (
            <ul class="list-group">
              {Object.entries(this.wordErrorCounts).map(([error, count]) => (
                <li class="list-group-item">
                  <span
                    class="badge me-2"
                    style={{ backgroundColor: this.getErrorColor(error) }}
                  >
                    {count}
                  </span>
                  {error}
                </li>
              ))}
            </ul>
          ) : (
            <p class="text-muted">Tidak ada kesalahan kata</p>
          )}
        </div>
      </div>
    );
  }
});
