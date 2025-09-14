import Image from 'next/image'

export function CustomLoader() {
    return (
        <div className="w-[100vw] h-[100vh] flex items-center justify-center">
            <Image
                src='/images/loader.png'
                alt='spinner loader'
                width={100}
                height={100}
                className="animate-spin"
            />
        </div>
    )
}