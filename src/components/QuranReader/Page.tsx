// src/views/Page.tsx
import { defineComponent, computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useChapters } from "@/hooks/chapters";
// import komponen khusus untuk menampilkan ayat, misalnya ArabicText jika sudah ada
// import ArabicText from "@/components/ArabicText/ArabicText";

export default defineComponent({
  name: "PageView",
  setup() {
    const route = useRoute();
    // Ambil nomor halaman dari parameter route, default ke 1 jika tidak valid
  const pageNumber = ref<number>(parseInt(route.params.id as string, 10) || 1);

    const chapters = useChapters();

    // Filter surat (chapter) yang memiliki halaman tersebut (diasumsikan chapter.pages berupa array nomor halaman)
    const chaptersOnPage = computed(() => {
      return chapters.data.value.filter((ch: any) =>
        ch.pages && ch.pages.includes(pageNumber.value)
      );
    });

    // Jika nanti Anda memiliki data ayat (misalnya array dari QuranReader atau Words)
    // Anda dapat melakukan filter berdasarkan properti `page_number` seperti:
    // const versesOnPage = computed(() => {
    //   return allVerses.filter((verse) => verse.page_number === pageNumber.value);
    // });

    onMounted(() => {
      // Anda bisa melakukan fetch data tambahan jika diperlukan
      console.log("Menampilkan halaman", pageNumber.value);
    });
    return {
      pageNumber,
      chaptersOnPage,
      // versesOnPage, // jika ada
    };
  },
  render() {
    return (
      <div class="container my-4">
        <h2>Halaman {this.pageNumber}</h2>
        {this.chaptersOnPage.length === 0 ? (
          <p>Tidak ada surat atau ayat yang ditemukan di halaman ini.</p>
        ) : (
          this.chaptersOnPage.map((chapter: any) => (
            <div key={chapter.id} class="mb-4">
              <h3>{chapter.name_simple}</h3>
              {/* 
                Jika Anda memiliki data ayat, lakukan iterasi di sini untuk menampilkan komponen ayat.
                Contoh:
                {this.versesOnPage
                  .filter((verse: any) => verse.chapterId === chapter.id)
                  .map((verse: any) => (
                    <ArabicText 
                      key={verse.id} 
                      words={verse.words} 
                      chapterId={verse.chapterId} 
                      verseNumber={verse.number}
                      {...otherProps}
                    />
                  ))}
              */}
              <p>
                Daftar ayat untuk surat {chapter.name_simple} yang muncul di
                halaman {this.pageNumber} akan ditampilkan di sini.
              </p>
            </div>
          ))
        )}
      </div>
    );
  },
});
