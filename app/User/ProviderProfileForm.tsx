'use client'

import { useActionState } from 'react'
import { updateProviderProfile } from './actions'
import { initialProviderProfileState } from '@/services/providerProfile'
import ProfileForm from './ProfileForm'

type ProviderProfileFormProps = {
  firstName: string
  lastName: string
  email: string
  role: string
  phone: string
}

export default function ProviderProfileForm({
  firstName,
  lastName,
  email,
  role,
  phone,
}: ProviderProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProviderProfile,
    initialProviderProfileState
  )

  return (
    <ProfileForm
      firstName={firstName}
      lastName={lastName}
      email={email}
      role={role}
      phone={phone}
      state={state}
      pending={pending}
      formAction={formAction}
      ownershipMessage="Changes are applied only to your own provider account."
    />
  )
}
