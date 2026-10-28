<template>
  <v-row class="mb-6">
    <v-col cols="12">
      <v-card class="pa-4 elevation-4 rounded-xl chart-card">
        <div
          class="d-flex flex-wrap justify-space-between align-start mb-3 ga-2"
        >
          <div class="matrix-heading">
            <h3 class="text-h6 font-weight-bold text-on-surface mb-1">
              {{ $t('CardSorting.categoryMatrix') }}
            </h3>
            <p class="text-caption text-medium-emphasis mb-0">
              {{ $t('CardSorting.categoryMatrixHint') }}
            </p>
          </div>

          <div class="d-flex flex-wrap align-center ga-2">
            <v-btn-toggle
              v-model="displayMode"
              mandatory
              density="compact"
              color="primary"
              variant="outlined"
              divided
            >
              <v-btn value="absolute" size="x-small">
                {{ $t('CardSorting.absoluteValues') }}
              </v-btn>
              <v-btn value="percentage" size="x-small">
                {{ $t('CardSorting.percentageValues') }}
              </v-btn>
            </v-btn-toggle>

            <v-btn
              v-if="hasData"
              size="x-small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-image-outline"
              :loading="exportingPng"
              :disabled="exportingLatex"
              @click="onExportPng"
            >
              {{ $t('CardSorting.exportPng') }}
            </v-btn>
            <v-btn
              v-if="hasData"
              size="x-small"
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-file-code-outline"
              :loading="exportingLatex"
              :disabled="exportingPng"
              @click="onExportLatex"
            >
              {{ $t('CardSorting.exportLatex') }}
            </v-btn>
          </div>
        </div>

        <div v-if="!hasData" class="text-center text-medium-emphasis py-8">
          <v-icon size="40" color="grey-lighten-1">mdi-cards-outline</v-icon>
          <div class="text-body-2 mt-2">{{ $t('CardSorting.noAnswers') }}</div>
        </div>

        <div v-else class="matrix-scroll">
          <v-table density="compact" class="matrix-table">
            <thead>
              <tr>
                <th class="text-left sticky-label sticky-header">
                  {{ $t('CardSorting.card') }}
                </th>
                <th
                  v-for="category in categoryTitles"
                  :key="category"
                  class="text-center sticky-header header-cell"
                  :title="category"
                >
                  {{ truncate(category) }}
                </th>
                <th class="text-center sticky-header header-cell">
                  {{ $t('CardSorting.notCategorized') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="card in cardTitles" :key="card">
                <td
                  class="font-weight-medium sticky-label"
                  :title="card"
                >
                  {{ truncate(card, 28) }}
                </td>
                <td
                  v-for="category in categoryTitles"
                  :key="category"
                  class="text-center"
                >
                  <div
                    class="matrix-cell"
                    :style="cellStyle(matrix[card][category])"
                  >
                    {{ formatCell(matrix[card][category]) }}
                  </div>
                </td>
                <td class="text-center">
                  <div class="matrix-cell matrix-cell--muted">
                    {{ formatCell(matrix[card].__unassigned) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <p v-if="hasData" class="text-caption text-medium-emphasis mt-2 mb-0">
          {{ $t('CardSorting.matrixHint', { total: totalParticipants }) }}
        </p>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  UNASSIGNED_KEY,
  getCardTitles,
  getCategoryTitles,
  getSubmittedAnswers,
} from '../../utils/cardSortingAnalytics'
import {
  buildCategoryMatrixLatex,
  downloadTextFile,
  exportCategoryMatrixPng,
  formatMatrixValue,
} from '../../utils/cardSortingMatrixExport'
import { showError, showSuccess } from '@/shared/utils/toast'

const props = defineProps({
  test: {
    type: Object,
    required: true,
  },
  answers: {
    type: Array,
    default: () => [],
  },
})

const { t } = useI18n()
const displayMode = ref('absolute')
const exportingPng = ref(false)
const exportingLatex = ref(false)

const cardTitles = computed(() => getCardTitles(props.test))
const submittedAnswers = computed(() => getSubmittedAnswers(props.answers))
const categoryTitles = computed(() =>
  getCategoryTitles(props.test, submittedAnswers.value),
)
const totalParticipants = computed(() => submittedAnswers.value.length)

const hasData = computed(
  () => cardTitles.value.length > 0 && totalParticipants.value > 0,
)

const matrix = computed(() => {
  const result = {}
  cardTitles.value.forEach((card) => {
    result[card] = { [UNASSIGNED_KEY]: 0 }
    categoryTitles.value.forEach((category) => {
      result[card][category] = 0
    })
  })

  submittedAnswers.value.forEach((answer) => {
    const sorting = answer?.sorting || {}
    Object.entries(sorting).forEach(([category, cards]) => {
      ;(cards || []).forEach((cardTitle) => {
        if (!result[cardTitle]) return
        if (category === UNASSIGNED_KEY) {
          result[cardTitle][UNASSIGNED_KEY] += 1
        } else if (result[cardTitle][category] !== undefined) {
          result[cardTitle][category] += 1
        }
      })
    })
  })

  return result
})

const truncate = (text, max = 16) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const formatCell = (count) =>
  formatMatrixValue(count, displayMode.value, totalParticipants.value)

const cellStyle = (count) => {
  if (!count || !totalParticipants.value) return {}
  const intensity = count / totalParticipants.value
  return {
    backgroundColor: `rgba(63, 81, 181, ${0.15 + intensity * 0.6})`,
    color: intensity > 0.6 ? '#fff' : 'inherit',
  }
}

const exportPayload = () => ({
  title: t('CardSorting.categoryMatrix'),
  cardLabel: t('CardSorting.card'),
  cardTitles: cardTitles.value,
  categoryTitles: categoryTitles.value,
  unassignedLabel: t('CardSorting.notCategorized'),
  matrix: matrix.value,
  displayMode: displayMode.value,
  totalParticipants: totalParticipants.value,
})

const onExportPng = async () => {
  if (!hasData.value || exportingPng.value) return
  exportingPng.value = true
  try {
    await exportCategoryMatrixPng({
      ...exportPayload(),
      filename: `card-category-matrix-${Date.now()}.png`,
    })
    showSuccess('CardSorting.exportPngSuccess')
  } catch (error) {
    console.error(error)
    showError('CardSorting.exportFailed')
  } finally {
    exportingPng.value = false
  }
}

const onExportLatex = () => {
  if (!hasData.value || exportingLatex.value) return
  exportingLatex.value = true
  try {
    const latex = buildCategoryMatrixLatex(exportPayload())
    downloadTextFile(
      latex,
      `card-category-matrix-${Date.now()}.tex`,
      'application/x-tex;charset=utf-8',
    )
    showSuccess('CardSorting.exportLatexSuccess')
  } catch (error) {
    console.error(error)
    showError('CardSorting.exportFailed')
  } finally {
    exportingLatex.value = false
  }
}
</script>

<style scoped>
.matrix-heading {
  max-width: 420px;
}

.matrix-scroll {
  overflow: auto;
  max-width: 100%;
  max-height: min(62vh, 560px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.matrix-table {
  min-width: max-content;
  font-size: 0.75rem;
}

.matrix-table :deep(th),
.matrix-table :deep(td) {
  padding: 4px 6px !important;
  height: auto !important;
}

.header-cell {
  max-width: 72px;
  white-space: nowrap;
  font-size: 0.7rem;
  vertical-align: bottom;
}

.sticky-label {
  position: sticky;
  left: 0;
  background: #fff;
  z-index: 2;
  min-width: 96px;
  max-width: 150px;
  box-shadow: 1px 0 0 #e5e7eb;
}

.sticky-header {
  position: sticky;
  top: 0;
  background: #fafafa;
  z-index: 3;
  box-shadow: 0 1px 0 #e5e7eb;
}

.sticky-label.sticky-header {
  z-index: 4;
}

.matrix-cell {
  min-width: 32px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 1.2;
  display: inline-block;
}

.matrix-cell--muted {
  color: #9e9e9e;
}
</style>
