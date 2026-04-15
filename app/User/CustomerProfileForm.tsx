'use client'

import { useActionState } from 'react'
import { updateCustomerProfile } from './actions'
import { initialCustomerProfileState } from '@/services/customerProfile'
import ProfileForm from './ProfileForm'

type CustomerProfileFormProps = {
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function CustomerProfileForm({
  firstName,
  lastName,
  email,
  role,
}: CustomerProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCustomerProfile,
    initialCustomerProfileState
  )

  return (
    <ProfileForm
      firstName={firstName}
      lastName={lastName}
      email={email}
      role={role}
      state={state}
      pending={pending}
      formAction={formAction}
      ownershipMessage="Changes are applied only to your own customer account."
    />
  )
}
