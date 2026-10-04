import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, initials } from '@/lib/utils'

export function Avatar({ src, name, size = 'md', className }) {
  return (
    <AvatarPrimitive.Root className={cn('avatar', `avatar-${size}`, className)}>
      {src ? <AvatarPrimitive.Image src={src} alt="" loading="lazy" /> : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 300 : 0}
        className="d-flex align-items-center justify-content-center w-100 h-100"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
