import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive, watch } from "vue";
import { useChapters } from "@/hooks/chapters";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";
import toast from "@/lib/toast";

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
    });

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
      
      };
      return colorMap[error] || "#6c757d";
    }

    function submitRecap() {
      const recapPayload = {
        namapeserta: recapData.namapeserta,
        namaPenyimak: recapData.namaPenyimak,
        kesimpulan: recapData.kesimpulan,
        catatan: recapData.catatan,
        verseErrors: verseErrors.value,
        wordErrorCounts: wordErrorCounts.value,
        startSurah: selectedStartSurah.value,
        startVerse: selectedStartVerse.value,
        endSurah: selectedEndSurah.value,
        endVerse: selectedEndVerse.value
      };

      console.log("Recap Data:", recapPayload);

      localStorage.setItem("recapData", JSON.stringify(recapPayload));
      toast.success("Hasil berhasil terkirim!");

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

    return {
      recapData,
      verseErrors,
      wordErrorCounts,
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
      surahOptions
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

          <div class="mb-3">
            <label class="form-label">Kesimpulan</label>
            <select class="form-select" style="max-width: 200px;" v-model={this.recapData.kesimpulan}>
              <option value="" style="color: grey;">Pilih Kesimpulan</option>
              <option value="Lancar">Lancar</option>
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
          <h5>Kesalahan Ayat:</h5>
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
          <h5>Kesalahan Kata:</h5>
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
  },
});
