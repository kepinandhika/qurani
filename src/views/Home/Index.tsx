import { computed, defineComponent, h, ref, watch, onMounted } from "vue";
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
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";

type Tab = "surah" | "juz" | "page";
type ExtraTab = "grup" | "pengguna";

export default defineComponent({
  name: "CompleteComponent",
  components: {
    MainLayout,
    Card,
    vSelect,
    Surah,
    Juz,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const storage = useLocalStorage();
    const chapters = useChapters();
    const { t } = useI18n();

    // Tab utama untuk konten Surah/Juz/Halaman
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
        .sortByDesc((item: Bookmarks) => item!.created_at)
        .toArray();
    });

    if (["surah", "juz", "page"].includes(route.query.tab as string)) {
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

    // ===== Data untuk tab ekstra: Grup & Pengguna =====
    // Data untuk Grup & Anggota
    const groups = ref([
      {
        id: "a",
        name: "Magang PT Universal Big Data (UBIG) - 2025",
        members: [
          { value: 1, name: "Ahmad - SMK Brantas Karangkates" },
          { value: 2, name: "Galuh - SMK BRANTAS KARANGKATES" },
          { value: 3, name: "Richo - SMK Brantas Karangkates" },
          { value: 4, name: "Dimas - SMK Brantas Karangkates" },
          { value: 5, name: "Niko - SMK Brantas Karangkates" },
          { value: 6, name: "Lang - SMK Brantas Karangkates" },
          { value: 7, name: "Rotul - SMK Brantas Karangkates" },
          { value: 8, name: "Tari - SMK Brantas Karangkates" },
          { value: 9, name: "Farel Rasyah - SMK 4 Malang" },
          { value: 10, name: "Naufal - SMKN 8 MALANG" },
          { value: 11, name: "Rhama Damarwijaya - SMK PAWIYATAN SURABAYA" },
          { value: 12, name: "Rangga - SMKN 1 DLANGGU" },
          { value: 13, name: "Faiq Yassar - SMKN 4 MALANG" },
          { value: 14, name: "Ahmad Royhan Najib - SMKN 8 Jember" },
          { value: 15, name: "Naufal - SMKN 8 MALANG" },
          { value: 16, name: "Alief Abdur Rahman Salam - SMK Pawiyatan Surabaya" },
          { value: 17, name: "Zara Salsa Aulia - D2 PPLS - Polinema" },
          { value: 18, name: "Muhammad Farhan - D2 PPLS - Polinema" },
          { value: 19, name: "Ryan - SMKN 8 Malang" },
        ],
      },
      {
        id: "b",
        name: "Qurani 2025",
        members: [
          { value: 1221, name: "Galuh saputra kelak" },
          { value: 2827, name: "Kevin andhika pratama" },
          { value: 8723, name: "Dewa yuna yunino" },
          { value: 9012, name: "Niko sistiyan prayogi" },
          { value: 8790, name: "Alvin muh jaidi nur" },
        ],
      },
    ]);

    // Selected group & member (untuk Grup)
    const selectedGroup = ref<any>(null);
    const selectedMember = ref<any>(null);
    watch(selectedGroup, (newVal) => {
      if (!newVal) {
        selectedMember.value = null;
      }
      localStorage.setItem("selectedGroup", JSON.stringify(newVal));
    });
    watch(selectedMember, (newVal) => {
      localStorage.setItem("selectedMember", JSON.stringify(newVal));
      if (newVal) {
        localStorage.setItem("participantName", newVal.name);
      }
    });

    // Data untuk Pengguna
    const staticUsers = ref([
      { value: 4538, name: "Alfian prada prasetyo" },
      { value: 7689, name: "Lang natanegara maju" },
      { value: 7109, name: "Naufal prayoga" },
      { value: 8145, name: "Fauzan" },
      { value: 9021, name: "Tito Bryan ardiansyah" },
    ]);
    const selectedUser = ref<any>(null);
    watch(selectedUser, (newVal) => {
      localStorage.setItem("selectedUser", JSON.stringify(newVal));
      if (newVal) {
        localStorage.setItem("participantName", newVal.name);
      }
    });

    // Ambil pilihan dari localStorage saat onMounted
    onMounted(() => {
      const savedGroup = localStorage.getItem("selectedGroup");
      if (savedGroup) {
        try {
          selectedGroup.value = JSON.parse(savedGroup);
        } catch (e) {
          selectedGroup.value = null;
        }
      }
      const savedMember = localStorage.getItem("selectedMember");
      if (savedMember) {
        try {
          selectedMember.value = JSON.parse(savedMember);
        } catch (e) {
          selectedMember.value = null;
        }
      }
      const savedUser = localStorage.getItem("selectedUser");
      if (savedUser) {
        try {
          selectedUser.value = JSON.parse(savedUser);
        } catch (e) {
          selectedUser.value = null;
        }
      }
    });

    // Daftar anggota berdasarkan grup yang dipilih
    const currentMembers = computed(() => {
      if (!selectedGroup.value) return [];
      const group = groups.value.find((g) => g.id === selectedGroup.value.id);
      return group ? group.members : [];
    });

    // extraTab menentukan mode tampilan: "grup" atau "pengguna"
    const extraTab = ref<ExtraTab>("grup");

    // Method untuk validasi dan navigasi ke halaman surah favorite
    function handleSurahFavorite(surahName: string, surahRoute: string) {
      if (extraTab.value === "grup") {
        const selMember = localStorage.getItem("selectedMember");
        if (!selMember || selMember === "null") {
          toast.error("Pilih Anggota");
          return;
        }
      } else if (extraTab.value === "pengguna") {
        const selUser = localStorage.getItem("selectedUser");
        if (!selUser || selUser === "null") {
          toast.error("Pilih Teman");
          return;
        }
      }
      localStorage.setItem("selectedSurah", surahName);
      router.push(surahRoute);
    }

    return {
      t,
      tab,
      sort,
      bookmarks,
      halamanInput,
      isInputFilled,
      navigateToSurah,
      extraTab,
      groups,
      selectedGroup,
      selectedMember,
      currentMembers,
      staticUsers,
      selectedUser,
      router,
      handleSurahFavorite,
    };
  },
  render() {
    return (
      <MainLayout>
        {/* Navigation Tab Ekstra untuk Grup & Pengguna */}
        <Card class={"mb-3"}>
          <div class="d-flex justify-content-start mb-3">
            <ul class="nav nav-pills">
              <li
                class="nav-item"
                onClick={() => {
                  this.extraTab = "grup";
                  // Saat mode grup, kita tidak peduli selectedUser
                  this.selectedUser = null;
                }}
              >
                <div class={["nav-link cursor-pointer", { active: this.extraTab === "grup" }]}>
                  {this.t("general.group")}
                </div>
              </li>
              <li
                class="nav-item"
                onClick={() => {
                  this.extraTab = "pengguna";
                  // Saat mode pengguna, kita kosongkan selectedMember
                  this.selectedMember = null;
                }}
              >
                <div class={["nav-link cursor-pointer", { active: this.extraTab === "pengguna" }]}>
                  {this.t("general.users")}
                </div>
              </li>
            </ul>
          </div>

          {/* Tampilkan pilihan sesuai tab aktif */}
          {this.extraTab === "grup" ? (
            <div class="d-flex flex-wrap align-items-end gap-2 mb-3">
              <div style={{ width: this.currentMembers.length > 0 ? "auto" : "450px", minWidth: "450px" }}>
                <label class="mb-1 d-block">{this.t("general.group")}</label>
                <vSelect
                  modelValue={this.selectedGroup}
                  onUpdate:modelValue={(value: any) => {
                    this.selectedGroup = value;
                    this.selectedMember = null;
                  }}
                  options={this.groups}
                  label="name"
                  placeholder={this.t("general.agroup")}
                  style={{ width: this.currentMembers.length > 0 ? "auto" : "400px", minWidth: "400px" }}
                  class="w-100 w-md-auto"
                  clearable={true}
                />
              </div>
              <div style={{ width: this.currentMembers.length > 0 ? "auto" : "400px", minWidth: "450px" }}>
                <label class="mb-1 d-block">{this.t("general.friends")}</label>
                <vSelect
                  modelValue={this.selectedMember}
                  onUpdate:modelValue={(value: any) => (this.selectedMember = value)}
                  options={this.currentMembers}
                  label="name"
                  placeholder={this.t("general.frien")}
                  style={{ width: this.currentMembers.length > 0 ? "auto" : "400px", minWidth: "450px" }}
                  class="w-100 w-md-auto"
                />
              </div>
            </div>
          ) : (
            <div class="mb-3" style={{ maxWidth: "300px" }}>
              <label class="mb-1 d-block">{this.t("general.users")}</label>
              <vSelect
                modelValue={this.selectedUser}
                onUpdate:modelValue={(value: any) => (this.selectedUser = value)}
                options={this.staticUsers}
                label="name"
                placeholder={this.t("general.select_user")}
                style={{ width: "300px", minWidth: "300px" }}
              />
            </div>
          )}
        </Card>

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
                  <a
                    class="px-2 py-1 bg-warning rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("Ya-Sin", "/surah/36")}
                  >
                    Yasin
                  </a>
                  <a
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("Al-Mulk", "/surah/67")}
                  >
                    Al-Mulk
                  </a>
                  <a
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("Al-Waqi'ah", "/surah/56")}
                  >
                    Al-Waqi'ah
                  </a>
                  <a
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("Al-Kahf", "/surah/18")}
                  >
                    Al-Kahf
                  </a>
                  <a
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("An-Naba", "/surah/78")}
                  >
                    An-Naba
                  </a>
                  <a
                    class="px-2 py-1 bg-success rounded text-dark text-sm sm:text-base cursor-pointer"
                    onClick={() => this.handleSurahFavorite("Al-Baqarah", "/surah/2")}
                  >
                    Al-Baqarah
                  </a>
                </div>
              </div>
            ),
          }}
        </Card>

        {/* Navigation Tab Utama untuk Surah, Juz, Halaman */}
        <div class="d-flex justify-content-between mb-3">
          <ul class="nav nav-pills mb-3">
            <li class="nav-item" onClick={() => (this.tab = "surah")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "surah" }]}>
                {this.t("general.surah")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "juz")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "juz" }]}>
                {this.t("general.juz")}
              </div>
            </li>
            <li class="nav-item" onClick={() => (this.tab = "page")}>
              <div class={["nav-link cursor-pointer", { active: this.tab === "page" }]}>
                {this.t("general.halaman")}
              </div>
            </li>
          </ul>
          {this.tab !== "page" && this.tab !== "juz" && (
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
                  <font-awesome-icon icon={this.sort === "desc" ? "caret-down" : "caret-up"} class="ms-1" />
                </span>
              </small>
            </div>
          )}
        </div>

        {/* Konten Utama Berdasarkan Tab */}
        {this.tab === "page" ? (
          <div class="mb-4">
            <div class="input-group" style="max-width: 240px;">
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
        ) : this.tab === "surah" ? (
          // Kirim extraTab ke komponen Surah agar validasinya disesuaikan
          h(Surah, { sort: this.sort, extraTab: this.extraTab })
        ) : this.tab === "juz" ? (
          h(Juz, { sort: this.sort })
        ) : (
          h("div", {}, "")
        )}
      </MainLayout>
    );
  },
});
