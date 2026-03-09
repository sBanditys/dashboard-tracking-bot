'use client'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUpdateCampaign, campaignKeys } from '@/hooks/use-campaigns'
import { useBrands } from '@/hooks/use-tracking'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { CampaignForm } from '@/components/campaigns/campaign-form'
import { ConflictError } from '@/types/campaign'
import type { Campaign, CreateCampaignInput, UpdateCampaignInput } from '@/types/campaign'

interface EditCampaignModalProps {
  guildId: string
  campaignId: string
  campaign: Campaign & { brand: { id: string; label: string } }
  version: number
  open: boolean
  onClose: () => void
}

export function EditCampaignModal({
  guildId,
  campaignId,
  campaign,
  version,
  open,
  onClose,
}: EditCampaignModalProps) {
  const updateCampaign = useUpdateCampaign(guildId, campaignId)
  const queryClient = useQueryClient()
  const { data: brandsData, isLoading: brandsLoading } = useBrands(guildId)

  const [formTouched, setFormTouched] = useState(false)

  const brands = useMemo(() => {
    if (!brandsData?.brands) return []
    return brandsData.brands.map((b) => ({ id: b.id, label: b.label }))
  }, [brandsData])

  // Build initial values from campaign prop
  const initialValues = useMemo(
    () => ({
      name: campaign.name,
      brandId: campaign.brandId,
      budgetCents: campaign.budgetCents,
      perUserCapCents: campaign.perUserCapCents,
      instagramRateCents: campaign.instagramRateCents ?? 0,
      tiktokRateCents: campaign.tiktokRateCents ?? 0,
      youtubeRateCents: campaign.youtubeRateCents ?? 0,
      closeThreshold: campaign.closeThreshold,
      rules: campaign.rules,
      dailySubmissionLimit: campaign.dailySubmissionLimit,
      paymentMethods: campaign.paymentMethods,
      reviewChannelId: campaign.reviewChannelId,
      alertsChannelId: campaign.alertsChannelId,
      announcementChannelId: campaign.announcementChannelId,
      version,
    }),
    [campaign, version]
  )

  useUnsavedChanges(formTouched && open)

  const handleSubmit = useCallback(
    (values: CreateCampaignInput | UpdateCampaignInput) => {
      updateCampaign.mutate(values as UpdateCampaignInput, {
        onSuccess: () => {
          setFormTouched(false)
          onClose()
        },
        onError: (error) => {
          if (error instanceof ConflictError) {
            toast.error('Campaign was modified by someone else', {
              action: {
                label: 'Refresh',
                onClick: () =>
                  queryClient.invalidateQueries({
                    queryKey: campaignKeys.detail(guildId, campaignId),
                  }),
              },
            })
            onClose()
          }
          // Non-conflict errors are toasted by the hook's onError
        },
      })
    },
    [updateCampaign, onClose, queryClient, guildId, campaignId]
  )

  const handleClose = useCallback(() => {
    setFormTouched(false)
    updateCampaign.reset()
    onClose()
  }, [updateCampaign, onClose])

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-w-lg w-full bg-surface border border-border rounded-lg p-6 space-y-4 transition-all duration-200 ease-in-out max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-white">
            Edit Campaign
          </DialogTitle>

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onKeyDown={() => setFormTouched(true)} onClick={() => setFormTouched(true)}>
            <CampaignForm
              mode="edit"
              initialValues={initialValues}
              onSubmit={handleSubmit}
              isPending={updateCampaign.isPending}
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
