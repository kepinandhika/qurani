import { defineComponent, ref } from "vue";
import MainLayout from "@/components/Layout/MainLayout";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { useRouter } from "vue-router";
import { customAlphabet } from "nanoid"; // Import nanoid

const supabase = createClient(
  "https://qeuhokzdmdygyuopbyqp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldWhva3pkbWR5Z3l1b3BieXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNjc2MDEsImV4cCI6MjA1NTk0MzYwMX0.JuYqudZHTeRy4GYLkS5pYhjbko7Bu3GSs7mKCWNMmxw"
);

const InputField = defineComponent({
  props: {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, default: "text" },
    modelValue: { type: String, required: true },
  },

  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => (
      <div class="mb-4">
        <input
          type={props.type}
          id={props.id}
          value={props.modelValue}
          onInput={(e) =>
            emit("update:modelValue", (e.target as HTMLInputElement).value)
          }
          class="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent text-white placeholder-gray-400"
          placeholder={props.label}
          required
        />
      </div>
    );
  },
});

export default defineComponent({
  components: {
    InputField,
  },
  setup() {
    const router = useRouter();
    const name = ref("");
    const email = ref("");
    const password = ref("");
    const errorMessage = ref("");
    const successMessage = ref("");
    const isLoading = ref(false);

    const validateEmail = (email: string) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    const validatePassword = (password: string) => {
      return password.length >= 8;
    };

    const handleSubmit = async (event: Event) => {
      event.preventDefault();
      errorMessage.value = "";
      successMessage.value = "";

      if (!validateEmail(email.value)) {
        errorMessage.value = "Please enter a valid email address.";
        return;
      }

      if (!validatePassword(password.value)) {
        errorMessage.value = "Password must be at least 8 characters long.";
        return;
      }

      isLoading.value = true;

      try {
        const hashedPassword = await bcrypt.hash(password.value, 10);
        const nanoid = customAlphabet(
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", // Huruf dan angka
          15 // Panjang ID
        );
        const userId = nanoid(); // Contoh: "aBcDeFgHiJkLmNo"

        // Simpan data pengguna ke tabel `user`
        const { error: userError } = await supabase.from("user").insert([
          {
            id: userId, // Tetap sebagai string
            nama: name.value,
            email: email.value,
            password: hashedPassword,
          },
        ]);

        if (userError)
          throw new Error(userError.message || "Failed to insert user.");

        // Simpan `userId` ke tabel `setting`
        const { error: settingError } = await supabase.from("setting").insert([
          {
            userid: userId,
          },
        ]);

        if (settingError)
          throw new Error(settingError.message || "Failed to insert setting.");

        successMessage.value = "Registration successful!";
        console.log("User registered in database.");

        router.push("/login");
      } catch (err) {
        errorMessage.value =
          err instanceof Error ? err.message : "An error occurred.";
      } finally {
        isLoading.value = false;
      }
    };

    return {
      name,
      email,
      password,
      errorMessage,
      successMessage,
      isLoading,
      handleSubmit,
      router,
    };
  },
  render() {
    return (
      <MainLayout>
        <div class="min-h-screen flex items-center justify-center bg-gray-900">
          <div class="bg-gray-800 p-10 rounded-lg shadow-lg w-96 text-center">
            <h1 class="text-3xl font-bold text-white mb-6">
              Create your account
            </h1>
            <form onSubmit={this.handleSubmit}>
              <InputField
                id="name"
                label="Name"
                modelValue={this.name}
                onUpdate:modelValue={(value: string) => (this.name = value)}
              />
              <InputField
                id="email"
                label="E-mail"
                type="email"
                modelValue={this.email}
                onUpdate:modelValue={(value: string) => (this.email = value)}
              />
              <InputField
                id="password"
                label="Password"
                type="password"
                modelValue={this.password}
                onUpdate:modelValue={(value: string) => (this.password = value)}
              />
              {this.errorMessage && (
                <div class="text-red-500 text-sm mb-4">{this.errorMessage}</div>
              )}
              {this.successMessage && (
                <div class="text-green-500 text-sm mb-4">
                  {this.successMessage}
                </div>
              )}
              <div class="flex items-center justify-center">
                <input type="checkbox" id="terms" required class="mr-2" />
                <label for="terms" class="text-white text-sm">
                  I've read and agree to{" "}
                  <span class="text-blue-400">Terms & Conditions</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={this.isLoading}
                class="w-full mt-4 py-2 text-white font-semibold bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition disabled:opacity-50"
              >
                {this.isLoading ? "Registering..." : "CREATE ACCOUNT"}
              </button>
              <p class="text-sm text-white mt-4">
                Already have an account??{" "}
                <span
                  class="text-blue-400 cursor-pointer"
                  onClick={() => this.router.push("/login")} 
                >
                  Login
                </span>
              </p>
            </form>
          </div>
        </div>
      </MainLayout>
    );
  },
});
