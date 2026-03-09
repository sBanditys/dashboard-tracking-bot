'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, useMemo, useCallback } from 'react'
import { useCreateCampaign } from '@/hooks/use-campaigns'
import { useBrands } from '@/hooks/use-tracking'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { CampaignForm } from '@/components/campaigns/campaign-form'
import type { CreateCampaignInput, UpdateCampaignInput } from '@/types/campaign'

interface CreateCampaignModalProps {
  guildId: string
  open: boolean
  onClose: () => void
}

export function CreateCampaignModal({ guildId, open, onClose }: CreateCampaignModalProps) {
  const createCampaign = useCreateCampaign(guildId)
  const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)

  // Track dirty state for unsaved changes warning
  const [formTouched, setFormTouched] = useState(false)

  const brands = useMemo(() => {
    if (!brandsData?.brands) return []
    return brandsData.brands.map((b) => ({ id: b.id, label: b.label }))
  }, [brandsData])

  // Warn on unsaved changes when modal is open and form has been touched
  useUnsavedChanges(formTouched && open)

  const handleSubmit = useCallback(
    (values: CreateCampaignInput | UpdateCampaignInput) => {
      createCampaign.mutate(values as CreateCampaignInput, {
        onSuccess: () => {
          setFormTouched(false)
          onClose()
        },
      })
    },
    [createCampaign, onClose]
  )

  const handleClose = useCallback(() => {
    setFormTouched(false)
    createCampaign.reset()
    onClose()
  }, [createCampaign, onClose])

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-lg w-full bg-surface border border-border rounded-lg p-6 space-y-4 transition-all duration-200 ease-in-out max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-white">
            Create Campaign
          </DialogTitle>

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onKeyDown={() => setFormTouched(true)} onClick={() => setFormTouched(true)}>
            <CampaignForm
              mode="create"
              onSubmit={handleSubmit}
              isPending={createCampaign.isPending}
              onCancel={handleClose}
              brands={brands}
              brandsLoading={brandsLoading}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
