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
    const halamanInput = ref<string>("1");

    const isInputFilled = computed(() => halamanInput.value.trim() !== "");

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

    if (["surah", "juz", "halaman"].includes(route.query.tab as string)) {
      tab.value = route.query.tab as Tab;
    }
    watch(tab, (value) => {
      historyReplaceState(null, { tab: value });
    });

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

    // ===== Fitur Grup dan Teman menggunakan Select secara Bersampingan =====
    // Data statis untuk dua grup: Grup A dan Grup B, masing-masing beranggotakan 5 orang
    const groups = ref([
      {
        id: "a",
        name: "Ubig 2025",
        members: [
          { id: 1, name: "Fatkul Amri - 7678" },
          { id: 2, name: "Asrori - 9809" },
          { id: 3, name: "Masum - 9890" },
          { id: 4, name: "Dimas - 6236" },
          { id: 5, name: "Richo - 2354" },
        ],
      },
      {
        id: "b",
        name: "Qurani 2025",
        members: [
          { id: 6, name: "Galuh - 1221" },
          { id: 7, name: "Kevin - 2827" },
          { id: 8, name: "Dewa - 8723" },
          { id: 9, name: "Niko - 9012" },
          { id: 10, name: "Alvin - 8790" },
        ],
      },
    ]);

    // Pilihan grup yang sedang dipilih, default Grup A
    const selectedGroup = ref("a");

    // Daftar anggota (teman) yang ditampilkan berdasarkan grup yang dipilih
    const currentMembers = computed(() => {
      const group = groups.value.find((g) => g.id === selectedGroup.value);
      return group ? group.members : [];
    });

    return {
      t,
      tab,
      sort,
      bookmarks,
      halamanInput,
      isInputFilled,
      navigateToSurah,
      // Data untuk grup dan teman (select)
      groups,
      selectedGroup,
      currentMembers,
    };
  },
  render() {
    return (
      <MainLayout>
        {/* Tampilan select untuk Grup dan Teman secara bersampingan */}
        <div class="d-flex gap-3 mb-3">
          <div class="flex-fill">
            <label class="mb-1 d-block">{this.t("general.group")}</label>
            <select
              class="form-select"
              value={this.selectedGroup}
              onChange={(e: Event) => {
                const sel = e.target as HTMLSelectElement;
                this.selectedGroup = sel.value;
              }}
            >
              {this.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div class="flex-fill">
            <label class="mb-1 d-block">{this.t("general.friends")}</label>
            <select class="form-select">
              <option value="">{this.t("general.frien")}</option>
              {this.currentMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card Favorit Surah */}
        <Card
          class={["mb-4 text-white", { "bg-white": !this.$setting.isDarkMode }]}
          headerClasses="d-flex justify-content-between bg-primary"
        >
          {{
            header: () => (
              <div class="card-title my-auto">
                <div class="text-center font-bold text-lg">
                  {this.t("general.surahfavorite")}
                </div>
              </div>
            ),
            default: () => (
              <div class="row custom-scrollbar" style="overflow-x: hidden; max-height: 200px">
                <div class="card-title my-auto d-flex flex-wrap gap-2 justify-center">
                  <router-link
                    to="/surah/36"
                    class="px-2 py-1 bg-warning rounded text-dark text-sm sm:text-base"
                  >
                    Yasin
                  </router-link>
                  <router-link
                    to="/surah/67"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Mulk
                  </router-link>
                  <router-link
                    to="/surah/56"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Waqi'ah
                  </router-link>
                  <router-link
                    to="/surah/18"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Kahf
                  </router-link>
                  <router-link
                    to="/surah/78"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    An-Naba
                  </router-link>
                  <router-link
                    to="/surah/2"
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base"
                  >
                    Al-Baqarah
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
            <div class="input-group" style="max-width: 350px;">
              <input
                type="number"
                class="form-control"
                placeholder={this.t("general.nohalaman")}
                value={this.halamanInput}
                min="1"
                max="604"
                style="width: 3ch;"
                onInput={(e: Event) => {
                  const inputEl = e.target as HTMLInputElement;
                  let inputVal = inputEl.value.replace(/\D/g, "");
                  if (inputVal.length > 3) {
                    inputVal = inputVal.slice(0, 3);
                    inputEl.value = inputVal;
                  }
                  const num = parseInt(inputVal, 10);
                  if (!isNaN(num) && num > 604) {
                    inputVal = "604";
                    inputEl.value = inputVal;
                  }
                  this.halamanInput = inputVal;
                }}
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    this.navigateToSurah();
                  }
                }}
              />
              <button class="btn btn-primary" disabled={!this.isInputFilled} onClick={this.navigateToSurah}>
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
          ? h("div", {}, "")
          : null}
      </MainLayout>
    );
  },
});
