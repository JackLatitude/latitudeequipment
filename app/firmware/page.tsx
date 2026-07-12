import { getFirmwareModels } from '@/lib/db/firmware'
import { countOutdated } from '@/lib/firmware/models'
import { FirmwareModelCard } from './_components/firmware-model-card'

export default async function FirmwarePage() {
  const models = await getFirmwareModels()
  const outdated = countOutdated(models)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-semibold text-white">Firmware</h1>
        {outdated > 0 && (
          <span className="text-sm text-brand-red">{outdated} out of date</span>
        )}
      </div>

      {models.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No cameras, monitors, or drones yet. Add equipment in those categories to track firmware.
        </p>
      ) : (
        <div className="space-y-4">
          {models.map((m) => (
            <FirmwareModelCard key={m.model} model={m} />
          ))}
        </div>
      )}
    </div>
  )
}
