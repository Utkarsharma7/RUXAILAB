import {
  buildCategoryMatrixLatex,
  escapeLatex,
  formatMatrixValue,
} from '@/ux/CardSorting/utils/cardSortingMatrixExport'

describe('cardSortingMatrixExport', () => {
  it('formats absolute and percentage values', () => {
    expect(formatMatrixValue(0, 'absolute', 10)).toBe('')
    expect(formatMatrixValue(3, 'absolute', 10)).toBe('3')
    expect(formatMatrixValue(3, 'percentage', 10)).toBe('30%')
  })

  it('escapes LaTeX special characters', () => {
    expect(escapeLatex('A & B_1%')).toBe('A \\& B\\_1\\%')
  })

  it('builds a LaTeX tabular for the category matrix', () => {
    const latex = buildCategoryMatrixLatex({
      title: 'Card × Category Matrix',
      cardLabel: 'Card',
      cardTitles: ['Home', 'Search'],
      categoryTitles: ['Nav', 'Content'],
      unassignedLabel: 'Not categorized',
      matrix: {
        Home: { Nav: 2, Content: 1, __unassigned: 0 },
        Search: { Nav: 0, Content: 3, __unassigned: 1 },
      },
      displayMode: 'absolute',
      totalParticipants: 3,
    })

    expect(latex).toContain('\\begin{tabular}{l|ccc}')
    expect(latex).toContain('Home & 2 & 1 & — \\\\')
    expect(latex).toContain('Search & — & 3 & 1 \\\\')
    expect(latex).toContain('\\caption{Card × Category Matrix}')
  })
})
