import { useChapters } from "@/hooks/chapters";
import { useHttpRetry } from "@/hooks/http";
import { defineComponent, PropType, ref, computed, h } from "vue"; // Import h for render function
import { useRouter } from "vue-router"; // Import useRouter
import { Juzs, Chapters, Sort } from "@/types";
import { makeUrl } from "@/helpers/api";
import collect from "collect.js";
import toast from "@/lib/toast"; // Import toast for user feedback
import styles from "../Style.module.scss";
import Icon from "@/components/Icon/Icon";

type DataItem = Juzs & { chapters: Chapters[] }; // Define a type for clarity
type Data = DataItem[];

export default defineComponent({
  name: "JuzPage", // Give the component a name
  props: {
    sort: {
      type: String as PropType<Sort>,
      required: true,
    },
  },
  async setup(props) {
    const router = useRouter(); // Initialize router for navigation
    const httpRetry = useHttpRetry();
    const chaptersHook = useChapters(); // Access chapter data

    // Renamed for clarity: this holds the processed data with chapter details
    const processedJuzs = ref<Data>([]);

    // Fetch and process data within setup
    try {
      const response = await httpRetry.get<{ juzs: Juzs[] }>(makeUrl("juzs"));
      const fetchedJuzs = response.data.juzs;

      // Process fetched data to include chapter objects
      const mappedJuzs = fetchedJuzs.map((item): DataItem => ({ // Explicitly type the result
        ...item,
        chapters: Object.keys(item.verse_mapping || {}) // Add safe guard for verse_mapping
          .map((id) => chaptersHook.find(Number(id)))
          // Use a type guard to filter out undefined and ensure correct type
          .filter((chapter): chapter is Chapters => chapter !== undefined),
      }));

      // Ensure we have entries for Juz 1-30, using the processed data
      const juzMap = new Map(mappedJuzs.map(j => [j.id, j]));
      const finalJuzs: Data = [];
      for (let i = 1; i <= 30; i++) {
        const juzData = juzMap.get(i);
        if (juzData) {
          finalJuzs.push(juzData);
        } else {
          // Handle missing Juz data if necessary (e.g., log warning)
           console.warn(`Data for Juz ${i} not found in the processed API response.`);
           // Optionally push a placeholder if needed for rendering consistency
           // finalJuzs.push({ id: i, verse_mapping: {}, chapters: [], /* other Juzs fields */ });
        }
      }
      processedJuzs.value = finalJuzs;

    } catch (error) {
        console.error("Failed to fetch or process Juz data:", error);
        toast.error("Failed to load Juz list.");
        processedJuzs.value = []; // Ensure it's an empty array on error
    }

    // Computed property for sorting the data for display
    const sortedData = computed<Data>(() => {
      const collection = collect(processedJuzs.value); // Use the processed data
      return (
        props.sort == "desc"
          ? collection.sortByDesc("id")
          : collection.sortBy("id")
      ).toArray();
    });

    // --- FUNCTION TO HANDLE JUZ SELECTION ---
    function handleJuzSelect(juzNumber: number) {
  console.log(`Handling selection for Juz ${juzNumber}`);

  // Temukan data juz yang dipilih dari processedJuzs
  const selectedJuzData = processedJuzs.value.find(j => j.id === juzNumber);

  if (!selectedJuzData || !selectedJuzData.chapters) {
    console.warn(`Chapter data for Juz ${juzNumber} not found or incomplete.`);
    toast.warn(`Surah list for Juz ${juzNumber} could not be determined.`);
    // Tetap navigasi meskipun data tidak lengkap
    router.push({ name: "juz", params: { id: juzNumber } });
    return;
  }

  // Persiapkan daftar Surah (chapters) yang akan disimpan
  const surahsToSave = selectedJuzData.chapters.map(chapter => ({
    SurahId: chapter.id,
    Surah: chapter.name_simple,
    // Tambahkan detail lain jika diperlukan
  }));

  try {
    // Menggunakan key yang konsisten (misal "selectedJuz") agar data tidak menumpuk
    localStorage.setItem(`selectedJuz`, JSON.stringify({
      juzNumber,
      surah: surahsToSave,
    }));
    console.log(`Successfully saved Surahs for Juz ${juzNumber} to localStorage.`, surahsToSave);
    toast.success(`Surah list for Juz ${juzNumber} saved locally.`);
  } catch (e) {
    console.error("Failed to save Surah list to localStorage:", e);
    toast.error("Could not save the Surah list locally.");
  }

  // Navigasi ke halaman Juz yang dipilih setelah menyimpan data
  router.push({ name: "juz", params: { id: juzNumber } });
}

    // --- END FUNCTION ---

    return {
      sortedData, // Data to be used by the render function
      handleJuzSelect, // Function to be called on click
    };
  },
  render() {
    // Use the 'sortedData' returned from setup
    const itemsToRender = this.sortedData;

    // Basic check if data is ready (could be enhanced with a proper loading state)
     if (!itemsToRender) {
        // This might occur briefly before async setup completes or on error
        return h('div', 'Loading Juz data...'); // Or use a skeleton/spinner
     }
     if (itemsToRender.length === 0) {
        // This means setup completed but resulted in empty data (e.g., fetch error handled)
        return h('div', 'No Juz data available.');
     }


    // Use Vue's h function for rendering
    return h('div', {}, [
      h('div', { class: 'd-flex flex-wrap gap-2' }, [
        // Map over the actual sorted data items
        itemsToRender.map((juzDataItem) => {
          const juzNumber = juzDataItem.id; // Get the Juz number from the data
          return h('div', {
              key: juzNumber,
              class: [styles.card_chapter, styles.border_radius_1rem],
              style: { width: "82px", cursor: "pointer" }, // Add cursor pointer for better UX
              // *** IMPORTANT: Call the handleJuzSelect function on click ***
              onClick: () => this.handleJuzSelect(juzNumber),
            },
            [
              h('div', { class: 'd-flex justify-content-between h-100' }, [
                h('div', { class: 'd-flex align-items-center' }, [
                  h('div', { class: 'me-1 position-relative d-flex align-items-center text-center' }, [
                    h(Icon, { class: styles.svg_icon, name: 'stars-islamic', width: 60, height: 60 }),
                    h('span', {
                        class: 'fw-bold h6 position-absolute text-primary',
                        style: 'transform: translate(-50%, -50%); left: 50%; top: 50%',
                      },
                      juzNumber.toString() // Display the Juz number
                    ),
                  ]),
                ]),
              ]),
            ]
          );
        }),
      ]),
    ]);
  },
});