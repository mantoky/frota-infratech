import { t } from '@/lib/hooks/useTranslations'

describe('Translation Function', () => {
  it('should return Portuguese translation by default', () => {
    const result = t('sidebarTitle', 'pt')
    expect(result).toBe('Frota Infratech')
  })

  it('should return English translation', () => {
    const result = t('sidebarTitle', 'en')
    expect(result).toBe('Infratech Fleet')
  })

  it('should return Spanish translation', () => {
    const result = t('sidebarTitle', 'es')
    expect(result).toBe('Flota Infratech')
  })

  it('should return key if translation not found', () => {
    const result = t('nonExistentKey', 'pt')
    expect(result).toBe('nonExistentKey')
  })

  it('should return Portuguese if language not found', () => {
    const result = t('sidebarTitle', 'fr')
    expect(result).toBe('Frota Infratech')
  })
})