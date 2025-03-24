import { useChapters } from "@/hooks/chapters";
import { useHttpRetry } from "@/hooks/http";
import { defineComponent, PropType, ref, computed } from "vue";
import { Juzs, Chapters, Sort } from "@/types";
import { makeUrl } from "@/helpers/api";
import collect from "collect.js";
import styles from "../Style.module.scss";
import Icon from "@/components/Icon/Icon";

type Data = (Juzs & { chapters: Chapters[] })[];

export default defineComponent({
  props: {
    sort: {
      type: String as PropType<Sort>,
      required: true,
    },
  },
  async setup(props) {
    const juzs_response = ref<Data>([]);
    const httpRetry = useHttpRetry();
    const chapters = useChapters();

    const juzs = ref<Data>([]);

    juzs_response.value = (
      await httpRetry.get<{ juzs: Juzs[] }>(makeUrl("juzs"))
    ).data.juzs.map((item) => ({
      ...item,
      chapters: Object.keys(item.verse_mapping)
        .map((id) => chapters.find(Number(id)))
        .filter((item) => item !== null) as Chapters[],
    }));

    // Removing duplicates
    for (let i = 1; i <= 30; i++) {
      juzs.value.push(juzs_response.value.filter((item) => item.id == i)[0] || null);
    }

    const data = computed<Data>(() => {
      const collection = collect(juzs.value);
      return (
        props.sort == "desc"
          ? collection.sortByDesc("id")
          : collection.sortBy("id")
      ).toArray();
    });

    return {
      data,
    };
  },
  render() {
    return (
      <div>
        <div class="d-flex flex-wrap gap-2">
          {[...Array(30)].map((_, index) => {
            const juzNumber = index + 1; // Nomor juz dimulai dari 1 hingga 30
            return (
              <div
                key={juzNumber}
                class={[styles.card_chapter, styles.border_radius_1rem]}
                style={{ width: "82px" }}
                onClick={() => this.$router.push({ name: "juz", params: { id: juzNumber } })}
              >
                <div class="d-flex justify-content-between h-100">
                  <div class="d-flex align-items-center">
                    <div class="me-1 position-relative d-flex align-items-center text-center">
                      <Icon class={styles.svg_icon} name="stars-islamic" width={60} height={60} />
                      <span
                        class="fw-bold h6 position-absolute text-primary"
                        style="transform: translate(-50%, -50%); left: 50%; top: 50%"
                      >
                        {juzNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
});