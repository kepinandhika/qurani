import { defineComponent, ref } from "vue";
import { useQuranReader } from "@/hooks/quran-reader";

export default defineComponent({
  setup() {
    // Ambil state dari hook
    const { translateMode } = useQuranReader();

    // Atur default value menjadi "read" jika belum ada nilai
    if (!translateMode.value) {
      translateMode.value = "read";
    }

    return {
      translateMode,
    };
  },
  render() {
    return (
      <>
        <nav class="nav nav-pills custom-nav-pills">
          <div
            class={["nav-link", { active: this.translateMode == "translated" }]}
            onClick={() => (this.translateMode = "translated")}
          >
            {this.$t("quran-reader.translated")}
          </div>
          <div
            class={["nav-link", { active: this.translateMode == "read" }]}
            onClick={() => (this.translateMode = "read")}
          >
            {this.$t("quran-reader.read")}
          </div>
        </nav>
      </>
    );
  },
});