'use client'

import Image from 'next/image'
import { eventCover, eventImages, groupedEventLinks, type EventImage } from '@/lib/events'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { EventRow } from '@/types/database'

/**
 * Artwork and links for an event, both read from `events.config`.
 *
 * The imagery is each event's own promotional art and photography, copied into
 * /public with the photographer credit kept alongside it, so the credit renders
 * wherever the picture does.
 */

/** Wide banner for the top of an event page. */
export function EventCover({ event, className }: { event: EventRow; className?: string }) {
  const cover = eventCover(event)
  if (!cover) return null

  return (
    <figure className={cn('relative border-4 border-black bg-black', className)}>
      <Image
        src={cover.path}
        alt={cover.alt || event.name}
        width={1200}
        height={500}
        priority
        className="w-full h-48 md:h-72 object-cover"
      />
      {cover.credit && <Credit credit={cover.credit} sourceUrl={cover.sourceUrl} className="absolute bottom-0 right-0" />}
    </figure>
  )
}

/** Small cover thumbnail for list cards. */
export function EventThumbnail({ event }: { event: EventRow }) {
  const cover = eventCover(event)
  if (!cover) return null

  return (
    <Image
      src={cover.path}
      alt={cover.alt || event.name}
      width={800}
      height={320}
      className="w-full h-36 object-cover border-b-4 border-black bg-black"
    />
  )
}

export function EventGallery({ event }: { event: EventRow }) {
  const cover = eventCover(event)
  const images = eventImages(event).filter(image => image.path !== cover?.path)
  if (images.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>From the event</CardTitle>
      </CardHeader>
      <CardContent className="py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {images.map(image => (
          <GalleryTile key={image.path} image={image} />
        ))}
      </CardContent>
    </Card>
  )
}

function GalleryTile({ image }: { image: EventImage }) {
  const body = (
    <>
      <Image
        src={image.path}
        alt={image.alt}
        width={600}
        height={340}
        className="w-full h-36 object-cover"
      />
      {image.caption && (
        <figcaption className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider bg-black text-yellow-400">
          {image.caption}
        </figcaption>
      )}
    </>
  )

  return (
    <figure className="relative border-2 border-black bg-white overflow-hidden">
      {image.link ? (
        <a href={image.link} target="_blank" rel="noopener noreferrer" className="block hover:opacity-90">
          {body}
        </a>
      ) : (
        body
      )}
      {image.credit && <Credit credit={image.credit} sourceUrl={image.sourceUrl} className="absolute top-0 right-0" />}
    </figure>
  )
}

function Credit({ credit, sourceUrl, className }: { credit: string; sourceUrl?: string; className?: string }) {
  const label = `© ${credit}`
  return (
    <span className={cn('px-1.5 py-0.5 text-[10px] font-bold uppercase bg-black/70 text-white', className)}>
      {sourceUrl ? (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {label}
        </a>
      ) : (
        label
      )}
    </span>
  )
}

export function EventLinks({ event }: { event: EventRow }) {
  const groups = groupedEventLinks(event)
  if (groups.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Official links</CardTitle>
      </CardHeader>
      <CardContent className="py-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
        {groups.map(group => (
          <div key={group.group}>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{group.group}</h4>
            <ul className="space-y-1">
              {group.links.map(link => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline underline-offset-2 hover:bg-yellow-200"
                  >
                    {link.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
