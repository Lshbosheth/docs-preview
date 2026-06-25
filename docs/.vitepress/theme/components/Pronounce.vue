<script setup lang="ts">
import { computed, ref } from "vue";

const defaultPrompt =
  "Read the target text in a calm, steady, natural American English voice for English learning. Use a moderate pace, smooth intonation, and crisp but relaxed pronunciation. Avoid sudden pitch jumps, sharp high tones, dramatic delivery, exaggerated emotion, and robotic rhythm. Add short natural pauses between sentences.";

const props = withDefaults(
  defineProps<{
    text: string;
    label?: string;
    lang?: string;
    voice?: string;
    prompt?: string;
  }>(),
  {
    label: "",
    lang: "en-US",
    voice: "Mia",
    prompt: defaultPrompt
  }
);

const isSpeaking = ref(false);
const audio = ref<HTMLAudioElement | null>(null);
const displayText = computed(() => props.label || props.text);

async function ttsHash(text: string, lang: string, voice: string, prompt: string) {
  const hashInput =
    prompt === defaultPrompt ? `${lang}\n${voice}\n${text}` : `${lang}\n${voice}\n${prompt}\n${text}`;
  const bytes = new TextEncoder().encode(hashInput);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

async function speak() {
  if (typeof window === "undefined") {
    return;
  }

  if (audio.value) {
    audio.value.pause();
    audio.value.currentTime = 0;
  }

  const hash = await ttsHash(props.text, props.lang, props.voice, props.prompt);
  const player = new Audio(`/audio/tts/${hash}.wav`);
  audio.value = player;
  isSpeaking.value = true;

  player.onended = () => {
    isSpeaking.value = false;
  };
  player.onerror = () => {
    isSpeaking.value = false;
  };

  try {
    await player.play();
  } catch {
    isSpeaking.value = false;
  }
}
</script>

<template>
  <span class="pronounce">
    <span class="pronounce__text">{{ displayText }}</span>
    <button
      class="pronounce__button"
      :class="{ 'pronounce__button--speaking': isSpeaking }"
      type="button"
      :aria-label="`Play pronunciation: ${text}`"
      :aria-pressed="isSpeaking"
      :title="`Play pronunciation: ${text}`"
      @click="speak"
    >
      <span class="pronounce__pulse" aria-hidden="true"></span>
      <span v-if="!isSpeaking" class="pronounce__play" aria-hidden="true"></span>
      <span v-else class="pronounce__wave" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    </button>
  </span>
</template>
