import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive } from "vue";

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
    const markedErrors = ref<MarkedError[]>([]);
    const recapData = reactive({
      namaPenyimak: "",
      kesimpulan: "",
      catatan: "",
      namapeserta: "",
      surahDibaca: "" 
    });

    // Data default untuk penyimak
    const defaultPenyimak = { value: 2378, name: "Fatkul Amri" };

    onMounted(() => {
      // Muat data kesalahan jika ada
      const data = localStorage.getItem("markedErrors");
      if (data) {
        markedErrors.value = JSON.parse(data);
        console.log("Data kesalahan dimuat:", markedErrors.value);
      }
      // Set nama penyimak default jika belum ada isian
      if (!recapData.namaPenyimak) {
        recapData.namaPenyimak = defaultPenyimak.name;
      }
      // Ambil nama peserta yang sudah tersimpan (misal dari komponen Index)
      const participantName = localStorage.getItem("participantName");
      if (participantName) {
        recapData.namapeserta = participantName;
      }
      if (markedErrors.value.length > 0) {
        recapData.surahDibaca = markedErrors.value[0].chapterName;
      }

    });

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

    // Mapping warna kesalahan berdasarkan jenisnya
    function getErrorColor(error: string): string {
      const colorMap: Record<string, string> = {
        "Gharib": "#CCCCCC",
        "Ghunnah": "#99CCFF",
        "Harokat Tertukar": "#DFF18F",
        "Huruf Tambah/Kurang": "#F4ACB6",
        "Lupa (tidak dibaca)": "#FA7656",
        "Mad (panjang pendek)": "#FFCC99",
        "Makhroj (pengucapan huruf)": "#F4A384",
        "Nun Mati dan Tanwin": "#F8DD74",
        "Qalqalah (memantul)": "#D5B6D4",
        "Tasydid (penekanan)": "#B5C9DF",
        "Urutan Huruf atau Kata": "#FE7D8F",
        "Waqof atau Washol (berhenti atau lanjut)": "#A1D4CF",
        "Waqof dan Ibtida (berhenti dan memulai)": "#90CBAA",
        "Lainnya": "#CC99CC",
        "Ayat Lupa (tidak dibaca)": "#FA7656",
        "Ayat Waqof atau Washol (berhenti atau lanjut)": "#FE7D8F",
        "Ayat Waqof dan Ibtida (berhenti dan memulai)": "#90CBAA",
        "LainNya": "#CC99CC"
      };
      return colorMap[error] || "#6c757d";
    }

    function submitRecap() {
      const recapPayload = {
        namaPenyimak: recapData.namaPenyimak,
        kesimpulan: recapData.kesimpulan,
        catatan: recapData.catatan,
        verseErrors: verseErrors.value,
        wordErrorCounts: wordErrorCounts.value
      };
      console.log("Recap submitted:", recapPayload);
      localStorage.setItem("recapData", JSON.stringify(recapPayload));
      router.push("/HasilRekapan");
    }

    function goBack() {
      router.go(-1);
    }

    return {
      recapData,
      verseErrors,
      wordErrorCounts,
      submitRecap,
      goBack,
      getErrorColor
    };
  },
  render() {
    return (
      <div class="container my-4">
        <button class="btn btn-link mb-3" style="text-decoration:none;" onClick={this.goBack}>
          <i class="bi bi-arrow-left"></i> {this.$t("general.back")}
        </button>

        <h2 class="mb-4 text-center">{this.$t("general.hasilrekap")}</h2>
        <div class="card p-4 shadow-sm">
          {/* Field Nama Peserta (tidak dapat diubah) */}
          <div class="mb-3">
            <label class="form-label">{this.$t("general.peserta")}</label>
            <input
              type="text"
              class="form-control"
              v-model={this.recapData.namapeserta}
              placeholder="Nama peserta"
              disabled
            />
          </div>
          {/* Field Nama Penyimak (tidak dapat diubah) */}
          <div class="mb-3">
            <label class="form-label">{this.$t("general.penyimak")}</label>
            <input
              type="text"
              class="form-control"
              v-model={this.recapData.namaPenyimak}
              placeholder="Masukkan nama penyimak"
              disabled
            />
          </div>
          <div class="mb-3">
            <label class="form-label">Surah yang dibaca : </label>
            <div class="card bg-white text-black p-2">
              <span>{this.recapData.surahDibaca}</span>
            </div>
          </div>

          <div class="mb-3">
            <h5>{this.$t("general.kesalahanayat")}</h5>
            {this.verseErrors.length === 0 ? (
              <p class="text-muted">Tidak ada kesalahan ayat.</p>
            ) : (
              <ul class="list-group">
                {this.verseErrors.map((err, index) => (
                  <li key={index} class="list-group-item">
                    <strong>Surah {err.surah}, Ayat {err.ayat}</strong>
                    <br />
                    Kesalahan:{" "}
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
          <div class="mb-3">
            <h5>{this.$t("general.kesalahankata")}</h5>
            {Object.entries(this.wordErrorCounts).length > 0 ? (
              <ul class="list-group">
                {Object.entries(this.wordErrorCounts).map(([error, count]) => (
                  <li class="list-group-item d-flex justify-content-start align-items-center">
                    <span
                      class="badge me-2"
                      style={{
                        backgroundColor: this.getErrorColor(error),
                        borderWidth: "2px",
                        fontWeight: "500",
                        textAlign: "center",
                        color: "#000000",
                        minWidth: "10px"
                      }}
                    >
                      {count}
                    </span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="text-muted">Tidak ada kesalahan kata</p>
            )}
          </div>
          <div class="mb-3">
            <label class="form-label">{this.$t("general.kesimpulan")}</label>
            <select class="form-select" v-model={this.recapData.kesimpulan}>
              <option value="">{this.$t("general.PKesimpulan")}</option>
              <option value="Lancar">Lancar</option>
              <option value="Tidak Lancar">Tidak Lancar</option>
              <option value="Lulus">Lulus</option>
              <option value="Tidak Lulus">Tidak Lulus</option>
              <option value="Mumtaz">Mumtaz</option>
              <option value="Dhoif">Dhoif</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">{this.$t("general.catatan")}</label>
            <textarea
              class="form-control"
              placeholder="Tambahkan catatan..."
              v-model={this.recapData.catatan}
            ></textarea>
          </div>
          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" 
            // onClick={this.submitRecap}
            >
              {this.$t("general.kirim")}
            </button>
          </div>
        </div>
      </div>
    );
  }
});
