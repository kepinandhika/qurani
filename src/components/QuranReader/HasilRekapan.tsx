import { defineComponent, onMounted, ref } from "vue";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface RecapData {
  namaPenyimak: string;
  kesimpulan: string;
  catatan: string;
  verseErrorCounts: Record<string, number>;
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

    return {
      recapData,
      pdfContentRef,
      printPDF,
    };
  },
  render() {
    if (!this.recapData) {
      return <div>Loading...</div>;
    }

    return (
      <div class="container my-4 d-flex flex-column align-items-center">
        {/* Tombol Kirim */}
        <div class="mb-3">
          <button class="btn btn-primary" onClick={this.printPDF}>
            Convert
          </button>
        </div>
        {/* Konten rekapan */}
        <div
          ref="pdfContentRef"
          class="w-100 bg-white p-4"
          style="text-align: left; margin: 0 auto; max-width: 800px;"
        >
          <h2 class="mb-3">Hasil Rekapan</h2>
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
            <h4>Rekapan Ayat:</h4>
            <ul>
              {Object.entries(this.recapData.verseErrorCounts).map(
                ([error, count]) => (
                  <li>{error}: {count}</li>
                )
              )}
            </ul>
          </div>
          <div class="mb-3">
            <h4>Rekapan Kata:</h4>
            <ul>
              {Object.entries(this.recapData.wordErrorCounts).map(
                ([error, count]) => (
                  <li>{error}: {count}</li>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }
});