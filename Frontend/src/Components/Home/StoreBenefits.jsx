import { BadgeCheck, CreditCard, Headset, RotateCcw, Truck } from 'lucide-react'
import PageContainer from '../CommenComponents/PageContainer'

const storeBenefits = [
  { icon: Truck, title: 'Free Shipping', description: 'On orders above ₹999' },
  { icon: RotateCcw, title: 'Easy Returns', description: 'Hassle-free returns' },
  { icon: BadgeCheck, title: '100% Original', description: 'Genuine products' },
  { icon: CreditCard, title: 'Secure Payments', description: 'Multiple payment options' },
  { icon: Headset, title: '24/7 Support', description: "We're here to help" },
]

export default function StoreBenefits() {
  return (
    <section aria-label="Shopping benefits" className="border-y border-slate-200 bg-slate-50/80">
      <PageContainer>
        <div className="grid grid-cols-2 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
          {storeBenefits.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`flex min-h-20 items-center justify-center gap-3 px-2 py-4 sm:border-r sm:border-slate-200 lg:py-5 ${
                index === 1 ? 'sm:border-r-0 lg:border-r' : ''
              } ${index === 4 ? 'col-span-2 sm:col-span-1 sm:border-r-0' : ''}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs font-bold leading-tight text-slate-900 sm:text-sm">{title}</h2>
                <p className="mt-1 text-[10px] leading-tight text-slate-500 sm:text-xs">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
