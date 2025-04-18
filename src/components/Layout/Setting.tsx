import { computed, defineComponent, Transition, watch, ref, onMounted, nextTick } from "vue";
import { LocaleCode } from "@/types";
import styles from "./Setting.module.scss";
import scroll from "@/helpers/scroll";
import Button from "@/components/Button/Button";
import UsePwa, { DefaultSlotProps } from "../PWA/UsePwa";
import Range from "../Input/Range";
import { useEventListener } from "@vueuse/core";
import Checkbox from "../Input/Checkbox";
import { FontType } from "@/hooks/settings";

export default defineComponent({
  emits: {
    "update:show": (value: boolean) => true,
  },
  props: {
    show: {
      type: Boolean,
    },
  },
  setup(props, { emit }) {
    // --- Konfigurasi dasar tampilan setting ---
    const scaleFitures = ref<boolean>(isSupportScale());
    const shouldShow = computed<boolean>({
      set(value) {
        emit("update:show", value);
      },
      get() {
        return Boolean(props.show);
      },
    });

    function isSupportScale() {
      const touchDevice = navigator.maxTouchPoints || "ontouchstart" in document.documentElement;
      const mobile = /iPhone|iPad|iPod|Android|webOS/i.test(navigator.userAgent);
      return Boolean(touchDevice && mobile);
    }

    useEventListener(window, "resize", () => {
      scaleFitures.value = isSupportScale();
    });

    watch(shouldShow, (show) => {
      show ? scroll.disable() : scroll.enable();
    }, { immediate: true });

    // --- Default error settings ---
    const defaultErrorColors = {
      Gharib: "#CCCCCC",
      Ghunnah: "#99CCFF",
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
      "Ayat Lupa (tidak dibaca)": "#FA7656",
      "Ayat Waqof atau Washol (berhenti atau lanjut)": "#FE7D8F",
      "Ayat Waqof dan Ibtida (berhenti dan memulai)": "#90CBAA",
      Lainnya: "#CC99CC",
    };

    // --- Reactive objects untuk error setting ---
    const errorColors = ref<Record<string, string>>({});
    const checkedErrors = ref<Record<string, boolean>>({});
    const customLabels = ref<Record<string, string>>({});
    const editingLabel = ref<string | null>(null);
    const errorTarget = ref<"global" | "grup" | "pengguna">("global");
    const selectedGroup = ref<any>(null);
    const selectedUser = ref<any>(null);
    const errorKeysOrder = ref<string[]>([]);

    // Computed untuk memisahkan label berdasarkan tipe:
    // Label yang diawali "Ayat" dianggap kesalahan per ayat, sisanya per kata.
    const perAyatKeys = computed(() =>
      errorKeysOrder.value.filter((key) => key.startsWith("Ayat"))
    );
    const perKataKeys = computed(() =>
      errorKeysOrder.value.filter((key) => !key.startsWith("Ayat"))
    );

    // Fungsi untuk menentukan storage key berdasarkan target
    const getStorageKey = () => {
      if (errorTarget.value === "global") return "qurani_setting_global";
      if (errorTarget.value === "grup" && selectedGroup.value)
        return "qurani_setting_grup_" + selectedGroup.value.id;
      if (errorTarget.value === "pengguna") return "qurani_setting_user"; // Kunci bersama untuk semua teman
      return null;
    };

    // Inisialisasi nilai default hanya jika tidak ada data di localStorage
    const initDefaults = () => {
      if (!errorKeysOrder.value.length) {
        errorKeysOrder.value = Object.keys(defaultErrorColors);
        errorColors.value = { ...defaultErrorColors };
      }

      const newCheckedErrors = { ...checkedErrors.value };
      const newCustomLabels = { ...customLabels.value };

      errorKeysOrder.value.forEach((label) => {
        if (newCheckedErrors[label] === undefined) {
          newCheckedErrors[label] = true;
        }
        if (newCustomLabels[label] === undefined) {
          newCustomLabels[label] = label;
        }
      });

      checkedErrors.value = newCheckedErrors;
      customLabels.value = newCustomLabels;
    };

    // Membersihkan kunci lama yang tidak ada di errorKeysOrder
    const cleanOldKeys = () => {
      const validKeys = new Set(errorKeysOrder.value);
      const cleanedCheckedErrors = { ...checkedErrors.value };
      const cleanedErrorColors = { ...errorColors.value };
      const cleanedCustomLabels = { ...customLabels.value };

      Object.keys(cleanedCheckedErrors).forEach((key) => {
        if (!validKeys.has(key)) {
          delete cleanedCheckedErrors[key];
        }
      });

      Object.keys(cleanedErrorColors).forEach((key) => {
        if (!validKeys.has(key)) {
          delete cleanedErrorColors[key];
        }
      });

      Object.keys(cleanedCustomLabels).forEach((key) => {
        if (!validKeys.has(key)) {
          delete cleanedCustomLabels[key];
        }
      });

      checkedErrors.value = cleanedCheckedErrors;
      errorColors.value = cleanedErrorColors;
      customLabels.value = cleanedCustomLabels;
    };

    // Load pengaturan dari localStorage
    const loadErrorSettings = () => {
      const key = getStorageKey();
      if (key) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            errorColors.value = parsed.errorColors || {};
            checkedErrors.value = parsed.checkedErrors || {};
            customLabels.value = parsed.customLabels || {};
            errorKeysOrder.value = parsed.errorKeysOrder || [];
            console.log("Loaded from localStorage:", parsed);
          } catch (e) {
            console.error("Failed to parse error settings:", e);
            errorColors.value = {};
            checkedErrors.value = {};
            customLabels.value = {};
            errorKeysOrder.value = [];
          }
        }
        cleanOldKeys();
        initDefaults();
      } else {
        console.warn("No storage key available, initializing defaults");
        errorColors.value = {};
        checkedErrors.value = {};
        customLabels.value = {};
        errorKeysOrder.value = [];
        initDefaults();
      }
    };

    // Simpan pengaturan ke localStorage
    const saveErrorSettings = () => {
      const key = getStorageKey();
      if (key) {
        const data = {
          checkedErrors: checkedErrors.value,
          customLabels: customLabels.value,
          errorColors: errorColors.value,
          errorKeysOrder: errorKeysOrder.value,
        };
        localStorage.setItem(key, JSON.stringify(data));
        console.log("Saved to localStorage:", data);
      } else {
        console.warn("No storage key available, skipping save");
      }
    };

    // Fungsi untuk memperbarui errorColors dan checkedErrors berdasarkan customLabels
    const updateSettingsOnLabelChange = (originalKey: string, newLabel: string) => {
      if (originalKey === newLabel) return;

      const index = errorKeysOrder.value.indexOf(originalKey);
      if (index === -1) return;

      const finalLabel = newLabel.trim() || "";

      const newErrorColors = { ...errorColors.value };
      if (newErrorColors[originalKey]) {
        newErrorColors[finalLabel] = newErrorColors[originalKey];
        delete newErrorColors[originalKey];
        errorColors.value = newErrorColors;
      }

      const newCheckedErrors = { ...checkedErrors.value };
      if (newCheckedErrors[originalKey] !== undefined) {
        newCheckedErrors[finalLabel] = newCheckedErrors[originalKey];
        delete newCheckedErrors[originalKey];
        checkedErrors.value = newCheckedErrors;
      }

      const newCustomLabels = { ...customLabels.value };
      newCustomLabels[finalLabel] = finalLabel;
      delete newCustomLabels[originalKey];
      customLabels.value = newCustomLabels;

      errorKeysOrder.value[index] = finalLabel;

      saveErrorSettings();
    };

    // Watch untuk menyimpan pengaturan saat errorColors, checkedErrors, atau errorKeysOrder berubah
    watch([errorColors, checkedErrors, customLabels, errorKeysOrder], () => {
      saveErrorSettings();
    }, { deep: true });

    // Watch untuk reload pengaturan saat target berubah
    watch(errorTarget, () => {
      loadErrorSettings();
    });

    // Watch untuk selectedGroup (tidak perlu selectedUser karena pengaturan teman sekarang bersifat bersama)
    watch([selectedGroup], ([group]) => {
      if (errorTarget.value === "grup" && !group) {
        errorTarget.value = "global";
      }
      loadErrorSettings();
    });

    onMounted(() => {
      // Load selectedGroup atau selectedUser dari localStorage
      const savedGroup = localStorage.getItem("selectedGroup");
      const savedUser = localStorage.getItem("selectedUser");

      if (savedGroup) {
        try {
          selectedGroup.value = JSON.parse(savedGroup);
          errorTarget.value = "grup";
        } catch (e) {
          console.error("Failed to parse selectedGroup:", e);
          selectedGroup.value = null;
        }
      }

      if (savedUser) {
        try {
          selectedUser.value = JSON.parse(savedUser);
          errorTarget.value = "pengguna";
        } catch (e) {
          console.error("Failed to parse selectedUser:", e);
          selectedUser.value = null;
        }
      }

      loadErrorSettings();
    });

    return {
      shouldShow,
      scaleFitures,
      errorColors,
      checkedErrors,
      customLabels,
      editingLabel,
      triggerNextTick: () => nextTick(),
      errorTarget,
      selectedGroup,
      selectedUser,
      updateSettingsOnLabelChange,
      errorKeysOrder,
      perAyatKeys,
      perKataKeys,
    };
  },
  render() {
    return (
      <Transition
        enterActiveClass={styles.animate_in}
        leaveActiveClass={styles.animate_out}
        onBeforeLeave={(el) => {
          el.classList.remove(styles.blur);
        }}
        onAfterEnter={(el) => {
          el.classList.add(styles.blur);
        }}
      >
        {this.shouldShow && (
          <div
            class={styles.container}
            style="z-index: 2147483647;"
            onClick={(e: Event) => {
              if ((e.target as HTMLElement).classList.contains(styles.card_container)) {
                this.shouldShow = false;
              }
            }}
          >
            <div class={styles.card_container}>
              <div class={["card", styles.card]}>
                <div class={["card-header d-flex justify-content-between", styles.card_header]}>
                  <h4 class="card-title">{this.$t("general.setting")}</h4>
                  <div class="h-100 d-flex align-items-center">
                    <button class="btn-close" onClick={() => (this.shouldShow = false)} aria-label="Close"></button>
                  </div>
                </div>
                <div class={["card-body custom-scrollbar", styles.card_body]}>
                  <UsePwa>
                    {({
                      default: (props: DefaultSlotProps) => (
                        <>
                          {props.isAvailable && (
                            <div class="d-flex justify-content-center mb-4 mt-3">{props.installButton()}</div>
                          )}
                        </>
                      )
                    })}
                  </UsePwa>

                  {this.scaleFitures && (
                    <>
                      <h6 class="heading-small">
                        {this.$t("general.scale")} {`(${this.$setting.scale})`}
                      </h6>
                      <Range v-model={this.$setting.scale} min={0.3} max={1} step={0.1} lazyUpdate />
                    </>
                  )}
                  <h6 class="heading-small">{this.$t("general.language")}</h6>
                  <select
                    class="form-select mb-2"
                    value={this.$setting.locale}
                    onInput={(e: Event) => (this.$setting.locale = (e.target as HTMLSelectElement).value as LocaleCode)}
                  >
                    {Object.keys(this.$config.LOCALE).map((locale) => (
                      <option key={locale} value={locale}>
                        {(this.$config.LOCALE as any)[locale]}
                      </option>
                    ))}
                  </select>
                  <h6 class="heading-small">{this.$t("general.theme")}</h6>
                  <nav class="nav nav-pills custom-nav-pills mb-2">
                    {this.$config.THEMES.map((theme) => (
                      <div
                        key={theme}
                        class={["nav-link", { active: this.$setting.theme == theme }]}
                        onClick={() => (this.$setting.theme = theme)}
                      >
                        <font-awesome-icon icon={theme == "auto" ? "lightbulb" : theme == "dark" ? "moon" : "sun"} />
                        <span class="ms-2">{this.$t(`setting.theme.${theme}`)}</span>
                      </div>
                    ))}
                  </nav>
                  {this.$setting.theme == "auto" && (
                    <small class="text-muted">{this.$t("setting.theme.message.auto")}</small>
                  )}
                  <hr />
                  <h6 class="heading-small">{this.$t("general.quran-font")}</h6>
                  <select
                    class="form-select mb-2"
                    value={this.$setting.fontType}
                    onInput={(e: Event) =>
                      (this.$setting.fontType = (e.target as HTMLSelectElement).value as unknown as FontType)
                    }
                  >
                    {this.$config.FONTS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>

                  <div class="d-flex justify-content-between mt-3">
                    <div class="h-100">
                      <h6 class="heading-small mt-2">{this.$t("general.font-size")}</h6>
                    </div>
                    <div class="d-flex">
                      <Button
                        onClick={() => this.$setting.fontSize--}
                        disabled={this.$setting.fontSize <= 1}
                        outline
                      >
                        <font-awesome-icon icon="minus" />
                      </Button>
                      <span class="h6 fw-bold h-100 d-flex align-items-center ms-4 me-4">
                        {this.$setting.fontSize}
                      </span>
                      <Button
                        onClick={() => this.$setting.fontSize++}
                        disabled={this.$setting.fontSize >= 10}
                        outline
                      >
                        <font-awesome-icon icon="plus" />
                      </Button>
                    </div>
                  </div>
                  <div class={["text-end font-arabic-auto fs-arabic-auto mt-3 mb-3", styles.text_bismillah]}>
                    بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                  </div>
                 
                 
                
                  <hr />

                  <h6 class="heading-small">Pengaturan Kesalahan</h6>
                  <div class="mb-3">
                    <select class="form-select" v-model={this.errorTarget}>
                      {/* Global tidak ditampilkan */}
                      <option value="grup">Grup</option>
                      <option value="pengguna">Teman</option>
                    </select>
                  </div>
                  <hr />

                  {/* Bagian untuk kesalahan Per Ayat */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h6 class="heading-small">Kesalahan Per Ayat</h6>
                    {this.perAyatKeys.length ? (
                      this.perAyatKeys.map((key) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: this.errorColors[key],
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            color: "#000",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="checkbox"
                            class="form-check-input"
                            checked={this.checkedErrors[key]}
                            onInput={(e: Event) => {
                              this.checkedErrors[key] = (e.target as HTMLInputElement).checked;
                            }}
                          />
                          {this.editingLabel === key ? (
                            <input
                              type="text"
                              data-editing={key}
                              style={{
                                border: "none",
                                background: "transparent",
                                width: "100%",
                              }}
                              value={this.customLabels[key] ?? ""}
                              onInput={(e: Event) => {
                                this.customLabels[key] = (e.target as HTMLInputElement).value;
                              }}
                              onBlur={() => {
                                const newLabel = this.customLabels[key] ?? "";
                                this.updateSettingsOnLabelChange(key, newLabel);
                                this.editingLabel = null;
                              }}
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                              <span style={{ flex: 1 }}>{this.customLabels[key] ?? ""}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24px"
                                height="24px"
                                viewBox="0 0 24 24"
                                fill="none"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  this.editingLabel = key;
                                  nextTick(() => {
                                    const inputEl = document.querySelector(
                                      `input[data-editing="${key}"]`
                                    ) as HTMLInputElement;
                                    if (inputEl) inputEl.focus();
                                  });
                                }}
                              >
                                <path
                                  d="M11 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40974 4.40973 4.7157 4.21799 5.09202C4 5.51985 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12.5M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.411 3.58902C18.192 2.80797 19.4584 2.80797 20.2394 3.58902C21.0205 4.37007 21.0205 5.6364 20.2394 6.41745L13.3774 13.2794C12.6158 14.0411 12.235 14.4219 11.8012 14.7247C11.4162 14.9936 11.0009 15.2162 10.564 15.3882C10.0717 15.582 9.54378 15.6885 8.48793 15.9016L8 16L8.04745 15.6678C8.21536 14.4925 8.29932 13.9048 8.49029 13.3561C8.65975 12.8692 8.89125 12.4063 9.17906 11.9786C9.50341 11.4966 9.92319 11.0768 10.7627 10.2373Z"
                                  stroke="#000000"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>Tidak ada kesalahan Per Ayat</p>
                    )}
                  </div>

                  <hr />

                  {/* Bagian untuk kesalahan Per Kata */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h6 class="heading-small">Kesalahan Per Kata</h6>
                    {this.perKataKeys.length ? (
                      this.perKataKeys.map((key) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: this.errorColors[key],
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            color: "#000",
                            gap: "8px",
                          }}
                        >
                          <input
                            type="checkbox"
                            class="form-check-input"
                            checked={this.checkedErrors[key]}
                            onInput={(e: Event) => {
                              this.checkedErrors[key] = (e.target as HTMLInputElement).checked;
                            }}
                          />
                          {this.editingLabel === key ? (
                            <input
                              type="text"
                              data-editing={key}
                              style={{
                                border: "none",
                                background: "transparent",
                                width: "100%",
                              }}
                              value={this.customLabels[key] ?? ""}
                              onInput={(e: Event) => {
                                this.customLabels[key] = (e.target as HTMLInputElement).value;
                              }}
                              onBlur={() => {
                                const newLabel = this.customLabels[key] ?? "";
                                this.updateSettingsOnLabelChange(key, newLabel);
                                this.editingLabel = null;
                              }}
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                              <span style={{ flex: 1 }}>{this.customLabels[key] ?? ""}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24px"
                                height="24px"
                                viewBox="0 0 24 24"
                                fill="none"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  this.editingLabel = key;
                                  nextTick(() => {
                                    const inputEl = document.querySelector(
                                      `input[data-editing="${key}"]`
                                    ) as HTMLInputElement;
                                    if (inputEl) inputEl.focus();
                                  });
                                }}
                              >
                                <path
                                  d="M11 4H7.2C6.0799 4 5.51984 4 5.09202 4.21799C4.71569 4.40974 4.40973 4.7157 4.21799 5.09202C4 5.51985 4 6.0799 4 7.2V16.8C4 17.9201 4 18.4802 4.21799 18.908C4.40973 19.2843 4.71569 19.5903 5.09202 19.782C5.51984 20 6.0799 20 7.2 20H16.8C17.9201 20 18.4802 20 18.908 19.782C19.2843 19.5903 19.5903 19.2843 19.782 18.908C20 18.4802 20 17.9201 20 16.8V12.5M15.5 5.5L18.3284 8.32843M10.7627 10.2373L17.411 3.58902C18.192 2.80797 19.4584 2.80797 20.2394 3.58902C21.0205 4.37007 21.0205 5.6364 20.2394 6.41745L13.3774 13.2794C12.6158 14.0411 12.235 14.4219 11.8012 14.7247C11.4162 14.9936 11.0009 15.2162 10.564 15.3882C10.0717 15.582 9.54378 15.6885 8.48793 15.9016L8 16L8.04745 15.6678C8.21536 14.4925 8.29932 13.9048 8.49029 13.3561C8.65975 12.8692 8.89125 12.4063 9.17906 11.9786C9.50341 11.4966 9.92319 11.0768 10.7627 10.2373Z"
                                  stroke="#000000"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>Tidak ada kesalahan Per Kata</p>
                    )}
                  </div>

                  <hr />

                  <div class="d-flex justify-content-center mt-4">
                    <Button type="primary" onClick={this.$setting.resetToDefault}>
                      {this.$t("setting.reset-default")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Transition>
    );
  },
});
