'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function HiddenEggLink({
                                          id,
                                          imgSrc = '/easter-egg.png',
                                          size = 28,
                                          className = 'opacity-60 hover:opacity-100 transition-opacity cursor-pointer',
                                          ariaLabel = 'Easter Egg',
                                      }: {
    id: string
    imgSrc?: string
    size?: number
    className?: string
    ariaLabel?: string
}) {
    return (
        <Link href={`/easter-egg/${id}`} aria-label={ariaLabel} className={className}>
            <Image src={imgSrc} alt={ariaLabel} width={size} height={size}/>
        </Link>
    )
}
