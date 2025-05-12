import { defineComponent, computed } from "vue";
import { useLocalStorage } from "@/hooks/storage";
import toast from "@/lib/toast";
import styles from "./Styles.module.scss";

export default defineComponent({
    props: {
        verseKey: {
            type: String,
            required: true
        }
    },

    setup(props) {
        const storage = useLocalStorage();

        const markedWords = computed(() => {
            const allErrors = storage.get("MURAJAAH_ERRORS", {}) as Record<string, number[]>;
            return allErrors[props.verseKey] || [];
        });

        function toggleMark(wordIndex: number) {
            storage.set("MURAJAAH_ERRORS", (allErrors: Record<string, number[]> = {}) => {
                if (!allErrors[props.verseKey]) {
                    allErrors[props.verseKey] = [];
                }

                const errors = allErrors[props.verseKey];
                if (errors.includes(wordIndex)) {
                    allErrors[props.verseKey] = errors.filter(index => index !== wordIndex);
                } else {
                    allErrors[props.verseKey].push(wordIndex);
                    toast.success(`Kata ke-${wordIndex + 1} di ayat ${props.verseKey} ditandai salah.`);
                }

                return allErrors;
            });
        }

        return {
            markedWords,
            toggleMark
        };
    },

    render() {
        const words = ["Inna", "a'toyna", "kal", "kautsar"];

        return (
            <div>
                {words.map((word, index) => (
                    <span
                        key={index}
                        class={[styles.word, { [styles.marked]: this.markedWords.includes(index) }]}
                        onClick={() => this.toggleMark(index)}
                    >
                        {word}{" "}
                    </span>
                ))}
            </div>
        );
    }
});
