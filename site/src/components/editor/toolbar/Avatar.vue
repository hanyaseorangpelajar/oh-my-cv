<template>
  <EditorToolbarBox
    :text="$t('toolbar.avatar.title')"
    icon="i-material-symbols:account-circle-outline"
  >
    <!-- Avatar Preview & Actions -->
    <div v-if="currentAvatar" class="flex flex-col gap-3">
      <div class="flex items-center gap-3 p-2 border rounded-lg bg-accent/30">
        <img
          :src="currentAvatar"
          :class="[
            'w-14 h-14 object-cover border shadow-sm',
            currentShape === 'circle' ? 'rounded-full' : currentShape === 'rounded' ? 'rounded-md' : 'rounded-none'
          ]"
          alt="Avatar Preview"
        />
        <div class="flex flex-col gap-1 text-xs">
          <span class="font-medium text-foreground">Current Photo</span>
          <span class="text-muted-foreground capitalize">{{ currentShape }} • {{ currentPos }}</span>
        </div>
      </div>

      <!-- Controls: Shape -->
      <div class="flex flex-col gap-1.5 mt-1">
        <label class="text-xs font-medium text-muted-foreground">{{ $t("toolbar.avatar.shape") }}</label>
        <div class="grid grid-cols-3 gap-1.5">
          <UiButton
            v-for="s in shapes"
            :key="s.value"
            size="xs"
            :variant="currentShape === s.value ? 'default' : 'outline'"
            @click="updateAvatarSetting('avatarShape', s.value)"
          >
            {{ s.label }}
          </UiButton>
        </div>
      </div>

      <!-- Controls: Position -->
      <div class="flex flex-col gap-1.5 mt-1">
        <label class="text-xs font-medium text-muted-foreground">{{ $t("toolbar.avatar.position") }}</label>
        <div class="grid grid-cols-2 gap-1.5">
          <UiButton
            v-for="p in positions"
            :key="p.value"
            size="xs"
            :variant="currentPos === p.value ? 'default' : 'outline'"
            @click="updateAvatarSetting('avatarPosition', p.value)"
          >
            {{ p.label }}
          </UiButton>
        </div>
      </div>

      <!-- Controls: Size -->
      <div class="flex flex-col gap-1.5 mt-1">
        <label class="text-xs font-medium text-muted-foreground">{{ $t("toolbar.avatar.size") }}</label>
        <div class="grid grid-cols-4 gap-1">
          <UiButton
            v-for="sz in sizes"
            :key="sz"
            size="xs"
            :variant="currentSize === sz ? 'default' : 'outline'"
            @click="updateAvatarSetting('avatarWidth', sz)"
          >
            {{ sz }}
          </UiButton>
        </div>
      </div>

      <!-- Buttons: Change & Remove -->
      <div class="flex gap-2 mt-2">
        <UiButton size="sm" class="flex-1" @click="openFileInput">
          <span class="i-carbon:upload mr-1 size-3.5" />
          {{ $t("toolbar.avatar.upload") }}
        </UiButton>
        <UiButton size="sm" variant="destructive" @click="removeAvatar">
          <span class="i-carbon:trash-can size-3.5" />
        </UiButton>
      </div>
    </div>

    <!-- Empty Upload Placeholder -->
    <div v-else class="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-accent/20 text-center gap-2">
      <div class="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-muted-foreground">
        <span class="i-material-symbols:add-a-photo-outline size-6" />
      </div>
      <p class="text-xs text-muted-foreground">
        Add an ID photo to your resume header
      </p>
      <UiButton size="sm" class="mt-1" @click="openFileInput">
        <span class="i-carbon:upload mr-1.5 size-4" />
        {{ $t("toolbar.avatar.upload") }}
      </UiButton>
    </div>

    <!-- Hidden File Input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Crop & Adjust Modal Dialog -->
    <UiDialog :open="isModalOpen" @update:open="isModalOpen = $event">
      <UiDialogContent class="sm:max-w-md">
        <UiDialogHeader>
          <UiDialogTitle>Crop & Adjust ID Photo</UiDialogTitle>
          <UiDialogDescription>
            Position and zoom your photo to fit standard CV dimensions (1:1).
          </UiDialogDescription>
        </UiDialogHeader>

        <div class="flex flex-col items-center gap-4 py-2">
          <!-- Canvas Crop Area -->
          <div class="relative w-64 h-64 border rounded-lg overflow-hidden bg-black/5 flex items-center justify-center shadow-inner">
            <canvas ref="canvasRef" class="max-w-full max-h-full cursor-grab active:cursor-grabbing"></canvas>

            <!-- Circular / Square Crop Guide Overlay -->
            <div
              :class="[
                'absolute inset-0 border-2 border-primary/70 pointer-events-none transition-all',
                modalShape === 'circle' ? 'rounded-full' : modalShape === 'rounded' ? 'rounded-xl' : 'rounded-none'
              ]"
            ></div>
          </div>

          <!-- Controls: Zoom -->
          <div class="w-full flex items-center gap-3 px-2 text-xs">
            <span class="i-carbon:zoom-out text-muted-foreground" />
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              v-model.number="zoom"
              @input="drawCanvas"
              class="w-full accent-primary h-1.5 bg-accent rounded-lg cursor-pointer"
            />
            <span class="i-carbon:zoom-in text-muted-foreground" />
          </div>

          <!-- Controls: Shape inside Modal -->
          <div class="w-full flex justify-between items-center text-xs">
            <span class="font-medium text-muted-foreground">Border Style:</span>
            <div class="flex gap-1.5">
              <UiButton
                v-for="s in shapes"
                :key="s.value"
                size="xs"
                :variant="modalShape === s.value ? 'default' : 'outline'"
                @click="modalShape = s.value"
              >
                {{ s.label }}
              </UiButton>
            </div>
          </div>
        </div>

        <UiDialogFooter class="gap-2 sm:gap-0">
          <UiButton variant="outline" size="sm" @click="isModalOpen = false">
            Cancel
          </UiButton>

          <UiButton size="sm" @click="applyCrop">
            <span class="i-carbon:checkmark mr-1 size-4" />
            Apply Photo
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  </EditorToolbarBox>
</template>

<script setup lang="ts">
import { FrontMatterParser } from "@ohmycv/front-matter";
import yaml from "js-yaml";
import type { ResumeFrontMatter } from "~/utils/markdown";

const { t } = useI18n();
const { data, setAndSyncToMonaco } = useDataStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const isModalOpen = ref(false);
const rawImage = ref<HTMLImageElement | null>(null);
const zoom = ref(1);
const modalShape = ref<"circle" | "rounded" | "square">("circle");

const shapes = computed(() => [
  { value: "circle" as const, label: t("toolbar.avatar.shape_circle") },
  { value: "rounded" as const, label: t("toolbar.avatar.shape_rounded") },
  { value: "square" as const, label: t("toolbar.avatar.shape_square") }
]);

const positions = computed(() => [
  { value: "left" as const, label: t("toolbar.avatar.pos_left") },
  { value: "right" as const, label: t("toolbar.avatar.pos_right") }
]);

const sizes = ["70px", "80px", "90px", "100px"];

const frontMatterParser = new FrontMatterParser<ResumeFrontMatter>({
  errorBehavior: "last"
});

// Parsed Current FrontMatter
const parsedFM = computed(() => {
  const md = data.markdown || "";
  return frontMatterParser.parse(md);
});

const currentAvatar = computed(() => parsedFM.value.frontMatter.avatar || "");
const currentShape = computed(() => parsedFM.value.frontMatter.avatarShape || "circle");
const currentPos = computed(() => parsedFM.value.frontMatter.avatarPosition || "left");
const currentSize = computed(() => parsedFM.value.frontMatter.avatarWidth || "80px");

const openFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      rawImage.value = img;
      zoom.value = 1;
      modalShape.value = currentShape.value || "circle";
      isModalOpen.value = true;
      nextTick(() => drawCanvas());
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
  target.value = "";
};

const drawCanvas = () => {
  const canvas = canvasRef.value;
  const img = rawImage.value;
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = 300;
  canvas.width = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);

  // Calculate scaled dimensions to cover 300x300
  const scale = Math.max(size / img.width, size / img.height) * zoom.value;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;

  ctx.drawImage(img, x, y, w, h);
};

const updateFrontMatter = (updatedFields: Partial<ResumeFrontMatter>) => {
  const md = data.markdown || "";
  const { body, frontMatter } = frontMatterParser.parse(md);

  const newFM = {
    ...frontMatter,
    ...updatedFields
  };

  // Remove empty avatar fields if set to undefined
  Object.keys(newFM).forEach((key) => {
    const k = key as keyof ResumeFrontMatter;
    if (newFM[k] === undefined) delete newFM[k];
  });

  const yamlStr = yaml.dump(newFM).trim();
  const newMarkdown = `---\n${yamlStr}\n---\n\n${body}`;

  setAndSyncToMonaco("markdown", newMarkdown);
};

const applyCrop = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  // Compress to base64 WebP / PNG data URL
  const dataUrl = canvas.toDataURL("image/webp", 0.9) || canvas.toDataURL("image/png");

  updateFrontMatter({
    avatar: dataUrl,
    avatarShape: modalShape.value,
    avatarPosition: currentPos.value || "left",
    avatarWidth: currentSize.value || "80px"
  });

  isModalOpen.value = false;
};

const updateAvatarSetting = (key: keyof ResumeFrontMatter, val: any) => {
  updateFrontMatter({ [key]: val });
};

const removeAvatar = () => {
  updateFrontMatter({
    avatar: undefined,
    avatarShape: undefined,
    avatarPosition: undefined,
    avatarWidth: undefined
  });
};
</script>
