import { defineComponent, ref } from "vue";
import MainLayout from "@/components/Layout/MainLayout";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { useRouter } from "vue-router";

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
    const userInput = ref(""); // Bisa username atau email
    const password = ref("");
    const errorMessage = ref("");
    const successMessage = ref("");
    const isLoading = ref(false);

    const isEmail = (input: string) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(input);
    };

    const handleSubmit = async (event: Event) => {
      event.preventDefault();
      errorMessage.value = "";
      successMessage.value = "";
      isLoading.value = true;

      try {
        // Cek apakah input adalah email atau username
        const field = isEmail(userInput.value) ? "email" : "username";

        // Cari user berdasarkan email atau username
        const { data, error } = await supabase
          .from("user")
          .select("*")
          .eq(field, userInput.value)
          .single();

        if (error || !data) {
          throw new Error("User not found.");
        }

        // Bandingin password
        const passwordMatch = await bcrypt.compare(
          password.value,
          data.password
        );
        if (!passwordMatch) {
          throw new Error("Incorrect password.");
        }

        successMessage.value = "Login successful!";
        console.log("User logged in.");
        localStorage.setItem("isLoggedIn", "true"); // Simpan status login
        localStorage.setItem("userId", data.id); // Simpan user ID
        router.push("/");
      } catch (err) {
        errorMessage.value =
          err instanceof Error ? err.message : "An error occurred.";
      } finally {
        isLoading.value = false;
      }
    };

    return {
      userInput,
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
            <h2 class="text-2xl font-bold text-white mb-6">Welcome Back!</h2>
            <form onSubmit={this.handleSubmit}>
              <InputField
                id="userInput"
                label="Username or Email"
                modelValue={this.userInput}
                onUpdate:modelValue={(value: string) =>
                  (this.userInput = value)
                }
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
              <button
                type="submit"
                disabled={this.isLoading}
                class="w-full mt-4 py-2 text-white font-semibold bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition disabled:opacity-50"
              >
                {this.isLoading ? "Logging in..." : "Login"}
              </button>
              <p class="text-sm text-white mt-4">
                Don't have an account?{" "}
                <span
                  class="text-blue-400 cursor-pointer"
                  onClick={() => this.router.push('/register')} // Navigasi ke /register
                >
                  Register
                </span>
              </p>
            </form>
          </div>
        </div>
      </MainLayout>
    );
  },
});