import translations from '../translations.json'
import { Translations } from '@/types'

const translationsData = translations as Translations

export const t = (key: string, lang: string): string => {
  return translationsData[key]?.[lang] || translationsData[key]?.['pt'] || key
}

export const getTranslations = () => translationsData