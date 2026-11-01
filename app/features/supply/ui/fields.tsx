'use client'

import { useTranslations } from 'next-intl'

import type { Reading, SupplyOptions } from '@/contracts/supply'

import { READINGS } from '../model/supply'

// 几处表单共用的输入：读法、类型、最晚时间
export const fieldClass = 'flex flex-col gap-1 text-sm'
export const inputClass =
  'border-input bg-background h-8 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3'

export function ReadingsField({
  value,
  onChange,
  name,
}: {
  value: Reading[]
  onChange: (next: Reading[]) => void
  name: string
}) {
  const t = useTranslations('supply.readings')
  return (
    <fieldset className={fieldClass}>
      <legend className="mb-1 font-medium">{t('label')}</legend>
      <div className="flex flex-wrap gap-3">
        {READINGS.map((reading) => (
          <label key={reading} className="flex items-center gap-1">
            <input
              type="checkbox"
              name={name}
              checked={value.includes(reading)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...value, reading] : value.filter((r) => r !== reading),
                )
              }
            />
            {t(reading)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// 能采的几大类（公告、政策法规、统计数据）下的细类
const COLLECTABLE_CLASSES = ['disclosure', 'policy', 'statistics']

export function DocTypeSelect({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: SupplyOptions | undefined
  value: string
  onChange: (next: string) => void
}) {
  const t = useTranslations('supply')
  const byClass = COLLECTABLE_CLASSES.map((cls) => ({
    cls,
    types: Object.entries(options?.doc_types ?? {})
      .filter(([type, of]) => of === cls && t.has(`docType.${type}`))
      .map(([type]) => type),
  }))
  return (
    <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      {byClass.map(({ cls, types }) => (
        <optgroup key={cls} label={t(`docClass.${cls}`)}>
          {types.map((type) => (
            <option key={type} value={type}>
              {t(`docType.${type}`)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
