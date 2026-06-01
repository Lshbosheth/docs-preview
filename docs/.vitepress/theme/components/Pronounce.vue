<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    text: string;
    label?: string;
    lang?: string;
  }>(),
  {
    label: "",
    lang: "en-US"
  }
);

const isSpeaking = ref(false);
const displayText = computed(() => props.label || props.text);

function pickVoice(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((voice) => voice.lang === props.lang) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

function speak() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(props.text);
  utterance.lang = props.lang;
  utterance.rate = 0.88;
  utterance.pitch = 1;

  const voice = pickVoice(window.speechSynthesis.getVoices());
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    isSpeaking.value = true;
  };
  utterance.onend = () => {
    isSpeaking.value = false;
  };
  utterance.onerror = () => {
    isSpeaking.value = false;
  };

  window.speechSynthesis.speak(utterance);
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
