import Image from 'next/image'

export const metadata = {
  title: 'Stone Age',
  robots: { index: false, follow: false },
}

const MANIFESTO =
  'We honor the spirit of real human connection through the act of disconnecting the unessential. This website is Not your burn. Go be free, play, connect, and grow... or not. Fuck your burn'

export default function StoneAgePage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-y-auto bg-black px-6 py-10 text-center">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="relative aspect-square w-full max-w-md">
          <Image
            src="/Images/stone-age.png"
            alt="Welcome to the stone age"
            fill
            priority
            sizes="(max-width: 768px) 90vw, 28rem"
            className="object-contain"
          />
        </div>

        <h1 className="font-[family-name:var(--font-graffiti)] text-3xl uppercase leading-tight tracking-wide text-white sm:text-5xl">
          Welcome to the stone age bitches
        </h1>

        <p className="max-w-xl text-lg leading-relaxed text-neutral-300 sm:text-xl">
          {MANIFESTO}
        </p>
      </div>
    </div>
  )
}
