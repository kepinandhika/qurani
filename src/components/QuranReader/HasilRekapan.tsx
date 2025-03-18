import { defineComponent, onMounted, ref } from "vue";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import router from "@/routes";

interface RecapData {
  namaPenyimak: string;
  kesimpulan: string;
  catatan: string;
  verseErrors: { surah: string; ayat: number; jenisKesalahan: string }[];
  wordErrorCounts: Record<string, number>;
}

export default defineComponent({
  name: "HasilRekapan",
  setup() {
    const recapData = ref<RecapData | null>(null);
    const pdfContentRef = ref<HTMLElement | null>(null);

    onMounted(() => {
      const data = localStorage.getItem("recapData");
      if (data) {
        recapData.value = JSON.parse(data);
        console.log("Data rekapan diterima:", recapData.value);
      }
    });

    function printPDF() {
      if (pdfContentRef.value) {
        html2canvas(pdfContentRef.value).then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save("Rekapan.pdf");
        });
      }
    }

    function goBack() {
      router.go(-1);
    }

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
      return colorMap[error] || "#6c757d"; // default gray jika tidak ditemukan
    }

    return {
      recapData,
      pdfContentRef,
      printPDF,
      goBack,
      getErrorColor,
    };
  },
  render() {
    if (!this.recapData) {
      return <div>Loading...</div>;
    }

    return (
      <div class="container my-4" style="max-width: 900px;">
        <button class="btn btn-link mb-3" style="text-decoration:none;" onClick={this.goBack}>
          <i class="bi bi-arrow-left"></i> Kembali
        </button>

        <h2 class="mb-4 text-center">Hasil Rekapan</h2>
        <div class="p-4" ref="pdfContentRef">
          <div class="mb-3">
            <h4>Nama Penyimak:</h4>
            <p>{this.recapData.namaPenyimak}</p>
          </div>
          <div class="mb-3">
            <h4>Kesimpulan:</h4>
            <p>{this.recapData.kesimpulan}</p>
          </div>
          <div class="mb-3">
            <h4>Catatan:</h4>
            <p>{this.recapData.catatan}</p>
          </div>
          <div class="mb-3">
            <h4>Rekapan Kesalahan Ayat:</h4>
            {this.recapData.verseErrors.length === 0 ? (
              <p class="text-muted">Tidak ada kesalahan ayat.</p>
            ) : (
              <ul class="list-group">
                {this.recapData.verseErrors.map((err, index) => (
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
            <h4>Rekapan Kata:</h4>
            <ul class="list-group">
              {Object.entries(this.recapData.wordErrorCounts).map(([error, count]) => (
                <li class="list-group-item d-flex justify-content-between">
                  <span>{error}</span> 
                  <span 
                    class="badge" 
                    style={{
                      backgroundColor: this.getErrorColor(error),
                      borderWidth: "2px",
                      fontWeight: "500",
                      textAlign: "left",
                      color: "#000000"
                    }}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div class="d-flex justify-content-end mt-3">
          <button class="btn btn-primary" onClick={this.printPDF}>Convert to PDF</button>
        </div>
      </div>
    );
  }
});