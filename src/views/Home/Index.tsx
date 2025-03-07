import { computed, defineComponent, h, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLocalStorage } from "@/hooks/storage";
import { useChapters } from "@/hooks/chapters";
import { useI18n } from "vue-i18n";
import { Bookmarks, Sort } from "@/types";
import MainLayout from "@/components/Layout/MainLayout";
import Card from "@/components/Card/Card";
import Surah from "./Surah/Index";
import Juz from "./Juz/Index";
import historyReplaceState from "@/helpers/history-replace-state";
import collect from "collect.js";
import toast from "@/lib/toast";

type Tab = "surah" | "juz" | "halaman";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const storage = useLocalStorage();
    const chapters = useChapters();
    const { t } = useI18n();

    const tab = ref<Tab>("surah");
    const sort = ref<Sort>("asc");
    // Menggunakan ref string untuk menyimpan input halaman
    const halamanInput = ref<string>("");

    // Validasi: input harus tidak kosong
    const isInputFilled = computed(() => {
      return halamanInput.value.trim() !== "";
    });

    const bookmarks = computed<Bookmarks[]>(() => {
      const bookmark = storage.get("BOOKMARK", {});
      if (!bookmark || typeof bookmark !== "object") {
        return [];
      }
      return collect(Object.keys(bookmark))
        .map((verse) => {
          const chapterNumber = Number(verse.split(":")[0]);
          const chapter = chapters.find(chapterNumber);
          if (!isNaN(chapterNumber) && chapter) {
            return {
              id: verse.split(":")[0],
              verse: verse.split(":")[1],
              verse_key: verse,
              name: chapter.name_simple,
              created_at: bookmark[verse],
            };
          }
          return null;
        })
        .filter((item) => item !== null)
        .sortByDesc((item: Bookmarks) => item.created_at)
        .toArray();
    });

    // Jika terdapat query parameter "tab", set tab sesuai nilainya
    if (["surah", "juz", "halaman"].includes(route.query.tab as string)) {
      tab.value = route.query.tab as Tab;
    }

    // Update history URL ketika tab berubah
    watch(tab, (value) => {
      historyReplaceState(null, { tab: value });
    });

    // Fungsi navigasi: validasi input dan arahkan ke route "chapter" dengan param id
    function navigateToSurah() {
      if (!isInputFilled.value) {
        toast.error("Nomor halaman tidak valid");
        return;
      }
      const pageNumber = parseInt(halamanInput.value, 10);
      if (!isNaN(pageNumber) && pageNumber > 0) {
        router.push({ name: "chapter", params: { id: pageNumber } });
      } else {
        toast.error("Nomor halaman tidak valid");
      }
    }

    return {
      tab,
      sort,
      bookmarks,
      halamanInput,
      isInputFilled,
      navigateToSurah,
      t,
    };
  },
  render() {
    return (
      <MainLayout>
        <Card
          class="mb-4 bg-primary bg-gradient text-white"
          headerClasses="d-flex justify-content-between"
        >
          {{
            header: () => (
              <div class="card-title my-auto">
                <div class="text-center font-bold text-lg mb-2">
                  {this.t("general.surahfavorite")}
                </div>
              </div>
            ),
            default: () => (
              <div
                class="row custom-scrollbar"
                style="overflow-x: hidden; max-height: 200px"
              >
                <div class="card-title my-auto d-flex flex-wrap gap-2 justify-center">
                  <router-link
                    to="/surah/36"
                    class="px-2 py-1 bg-primary text-white rounded-md text-sm sm:text-base"
                  >
                    Yasin
                  </router-link>
                  <router-link
                    to="/surah/18"
                    class="px-2 py-1 bg-primary text-white rounded-md text-sm sm:text-base"
                  >
                    Al-Kahf
                  </router-link>
                  <router-link
                    to="/surah/56"
                    class="px-2 py-1 bg-primary text-white rounded-md text-sm sm:text-base"
                  >
                    Al-Waqi'ah
                  </router-link>
                  <router-link
                    to="/surah/67"
                    class="px-2 py-1 bg-primary text-white rounded-md text-sm sm:text-base"
                  >
                    Al-Mulk
                  </router-link>
                </div>
              </div>
            ),
          }}
        </Card>
        <div class="d-flex justify-content-between mb-3">
          <ul class="nav nav-pills mb-3">
            <li class="nav-item" onClick={() => (this.tab = "surah")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "surah" }]}>
                {this.t("general.surah")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "juz")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "juz" }]}>
                {this.t("general.juz")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "halaman")}>
              <div class={["nav-link cursor-pointer", { active: this.tab == "halaman" }]}>
                {this.t("general.halaman")}
              </div>
            </li>
          </ul>
          {this.tab !== "halaman" && (
            <div class="my-auto">
              <small>
                <span class="me-2">{this.t("sort.by")}:</span>
                <span
                  class="text-primary cursor-pointer"
                  onClick={() => {
                    this.sort = this.sort === "desc" ? "asc" : "desc";
                  }}
                >
                  <span class="text-uppercase">{this.t(`sort.${this.sort}`)}</span>
                  <font-awesome-icon
                    icon={this.sort === "desc" ? "caret-down" : "caret-up"}
                    class="ms-1"
                  />
                </span>
              </small>
            </div>
          )}
        </div>
        {this.tab === "halaman" && (
          <div class="mb-4">
            <div class="input-group">
              <input
                type="number"
                class="form-control"
                placeholder={this.t("general.nohalaman")}
                // Menggunakan properti value dan onInput untuk TSX
                value={this.halamanInput}
                min="1"
                onInput={(e: Event) => {
                  this.halamanInput = (e.target as HTMLInputElement).value;
                }}
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    this.navigateToSurah();
                  }
                }}
              />
              <button
                class="btn btn-primary"
                disabled={!this.isInputFilled}
                onClick={this.navigateToSurah}
              >
                {this.t("general.gopage")}
              </button>
            </div>
          </div>
        )}
        {this.tab === "surah"
          ? h(Surah, { sort: this.sort })
          : this.tab === "juz"
          ? h(Juz, { sort: this.sort })
          : this.tab === "halaman"
          ? h("div", {}, "") // Ganti dengan komponen halaman jika diperlukan
          : null}
      </MainLayout>
    );
  },
});
