import router from "@/routes";
import { defineComponent, ref, computed, onMounted, reactive } from "vue";

interface MarkedError {
  word: any; // Jika Anda memiliki tipe khusus (misalnya Words), sesuaikan di sini
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
      catatan: ""
    });

    onMounted(() => {
      const data = localStorage.getItem("markedErrors");
      if (data) {
        markedErrors.value = JSON.parse(data);
        console.log("Data kesalahan dimuat:", markedErrors.value);
      }
    });

    const verseErrorCounts = computed(() => {
      const counts: Record<string, number> = {};
      markedErrors.value.forEach((err) => {
        if (err.isVerseError) {
          counts[err.Kesalahan] = (counts[err.Kesalahan] || 0) + 1;
        }
      });
      return counts;
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

    // Fungsi submit rekapan, yang menggabungkan data input pengguna dan hasil perhitungan kesalahan
    function submitRecap() {
      const recapPayload = {
        namaPenyimak: recapData.namaPenyimak,
        kesimpulan: recapData.kesimpulan,
        catatan: recapData.catatan,
        verseErrorCounts: verseErrorCounts.value,
        wordErrorCounts: wordErrorCounts.value
      };
      console.log("Recap submitted:", recapPayload);

      // Simpan data ke localStorage atau sessionStorage
      localStorage.setItem("recapData", JSON.stringify(recapPayload));

      // Navigasi ke halaman HasilRekapan tanpa mengirim data melalui URL
      router.push("/HasilRekapan");
    }

    // Fungsi untuk kembali ke halaman sebelumnya
    function goBack() {
      router.go(-1); // Kembali ke halaman sebelumnya
    }

    return {
      recapData,
      verseErrorCounts,
      wordErrorCounts,
      submitRecap,
      goBack // Tambahkan fungsi goBack ke return
    };
  },
  render() {
    return (
      <div class="container my-4">
        {/* Tombol Kembali di pojok kiri atas */}
        <button class="btn btn-link mb-3" style="text-decoration:none;" onClick={this.goBack}>
          <i class="bi bi-arrow-left"></i> Kembali
        </button>

        <h2 class="mb-4 text-center">Rekapan Kesalahan</h2>
        <div class="card p-4 shadow-sm">
          <div class="mb-3">
            <label class="form-label">Nama Penyimak:</label>
            <input 
              type="text" 
              class="form-control"
              v-model={this.recapData.namaPenyimak}
              placeholder="Masukkan nama penyimak"
            />
          </div>
          
          <div class="mb-3">
            <h4>Rekapan Ayat:</h4>
            <ul class="list-group">
              {Object.entries(this.verseErrorCounts).map(([error, count]) => (
                <li class="list-group-item d-flex justify-content-between">
                  <span>{error}</span> <span class="badge bg-danger">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div class="mb-3">
            <h4>Rekapan Kata:</h4>
            <ul class="list-group">
              {Object.entries(this.wordErrorCounts).map(([error, count]) => (
                <li class="list-group-item d-flex justify-content-between">
                  <span>{error}</span> <span class="badge bg-warning">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Kesimpulan:</label>
            <select 
              class="form-select"
              v-model={this.recapData.kesimpulan}
            >
              <option value="">Pilih kesimpulan</option>
              <option value="Lancar">Lancar</option>
              <option value="Tidak Lancar">Tidak Lancar</option>
              <option value="Lulus">Lulus</option>
              <option value="Tidak Lulus">Tidak Lulus</option>
              <option value="Mumtaz">Mumtaz</option>
              <option value="Dhoif">Dhoif</option>
            </select>
          </div>
          
          <div class="mb-3">
            <label class="form-label">Catatan:</label>
            <textarea 
              class="form-control"
              placeholder="Tambahkan catatan..."
              v-model={this.recapData.catatan}
            ></textarea>
          </div>
          
          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" onClick={this.submitRecap}>Submit Rekapan</button>
          </div>
        </div>
      </div>
    );
  }
});