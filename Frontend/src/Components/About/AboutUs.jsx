import {
  ArrowRight,
  Award,
  BadgeCheck,
  Box,
  Gem,
  Headset,
  Heart,
  HeartHandshake,
  Leaf,
  Package,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Users,
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const collections = [
  { name: "Shoes", description: "Comfort Meets Style", image: "shoes", position: "-3.2vw -72.1vw" },
  { name: "Bags", description: "Carry Your World", image: "bags", position: "-18.8vw -72.1vw" },
  { name: "Belts", description: "Statement of Style", image: "belts", position: "-34.8vw -72.1vw" },
  { name: "Wallets", description: "Keep It Classy", image: "wallets", position: "-50.7vw -72.1vw" },
  { name: "Accessories", description: "Complete Your Look", image: "accessories", position: "-66.4vw -72.1vw" },
  { name: "Gift Sets", description: "Perfect for Every Occasion", image: "gifts", position: "-82.2vw -72.1vw" },
];

const promises = [
  { title: "Authentic Products", description: "100% genuine and high-quality leather goods.", icon: BadgeCheck },
  { title: "Fast & Reliable Delivery", description: "Get your orders delivered safely and on time.", icon: Truck },
  { title: "Easy Returns", description: "Hassle-free return and exchange policy.", icon: Package },
  { title: "Dedicated Support", description: "We're here to help you anytime.", icon: Headset },
];

const testimonials = [
  { name: "Arun Kumar", quote: "Great quality products and fast delivery. My new shoes are super comfortable!", position: "-29.1vw -120.4vw" },
  { name: "Priya Sharma", quote: "Stylish bags and amazing customer service. Highly recommended!", position: "-55.3vw -120.4vw" },
  { name: "Rahul Nair", quote: "Best place for leather accessories. Good quality and value for money.", position: "-82.2vw -120.4vw" },
];

function Eyebrow({ children, centered = false }) {
  return (
    <p className={`mb-2 flex items-center gap-2 text-[.65rem] font-bold uppercase leading-[1.3] tracking-[.1em] ${centered ? "justify-center text-[#ff4b0b]" : "text-[#25272b]"}`}>
      <span className="inline-block h-0.5 w-[18px] bg-[#ff4b0b]" />
      {children}
    </p>
  );
}

export default function AboutUs() {
  return (
    <main className="bg-white text-[#111318]">
      <PageHeader
        title="About Us"
        background="/images/pageheader.png"
        backgroundSize="cover"
        backgroundPosition="left center"
        contentAlignment="left"
        heightClassName="h-[220px] sm:h-[250px] md:h-[280px] lg:h-[320px]"
        actionLabel="Shop Now"
        actionTo="/"
      />

      <section>
        <PageContainer className="grid items-center gap-[22px] py-5 md:grid-cols-2 md:gap-[clamp(32px,6vw,64px)]">
          <div
            className="relative aspect-[1.52] rounded-[5px] shadow-[0_5px_18px_rgba(43,29,19,.12)]"
            role="img"
            aria-label="Inside the StyleHub shoe and leather goods store"
            style={{ backgroundImage: "url('/about/stylehub-reference.png')", backgroundSize: "100vw auto", backgroundPosition: "-3.2vw -25.8vw" }}
          >
            <div
              className="absolute -bottom-[5%] -right-[5%] h-[60%] w-[30%] rounded-[5px] border-4 border-white shadow-[0_5px_15px_rgba(20,15,10,.2)] md:-right-[8%] md:h-[66%] md:w-[34%]"
              role="img"
              aria-label="A leather artisan crafting a product"
              style={{ backgroundImage: "url('/about/stylehub-reference.png')", backgroundSize: "100vw auto", backgroundPosition: "-36.1vw -37.5vw" }}
            />
          </div>
          <div className="py-2">
            <Eyebrow>Our Story</Eyebrow>
            <h2 className="m-0 text-[clamp(1.45rem,2.4vw,1.8rem)] font-extrabold leading-[1.1] tracking-[-.035em]">
              From a Passion for Style to a <span className="text-[#ff4b0b]">Trusted Destination</span>
            </h2>
            <p className="mt-[10px] text-[.85rem] leading-[1.55] text-[#252d38] md:text-[.76rem]">
              StyleHub was founded with a simple vision – to bring premium quality shoes, bags, belts, wallets and leather accessories to everyone who values style, comfort and durability.
            </p>
            <p className="mt-[10px] text-[.85rem] leading-[1.55] text-[#252d38] md:text-[.76rem]">
              What started as a small idea has now grown into a trusted destination for fashion lovers. We believe that the right accessories do more than complete your look – they reflect your personality, confidence and the journey you take in life.
            </p>
            <div className="mt-[14px] grid grid-cols-4 gap-1.5">
              <div className="flex flex-col items-center text-center"><Gem className="mb-1 h-[25px] w-[25px] fill-[#ff4b0b] text-white" /><strong className="text-[.58rem] leading-[1.15] sm:text-[.61rem]">Premium<br />Quality</strong><span className="mt-1 text-[.52rem] leading-[1.25] text-[#47505b] sm:text-[.55rem]">Carefully curated<br />products</span></div>
              <div className="flex flex-col items-center text-center"><Users className="mb-1 h-[25px] w-[25px] fill-[#ff4b0b] text-white" /><strong className="text-[.58rem] leading-[1.15] sm:text-[.61rem]">Wide<br />Collection</strong><span className="mt-1 text-[.52rem] leading-[1.25] text-[#47505b] sm:text-[.55rem]">Styles for every<br />lifestyle</span></div>
              <div className="flex flex-col items-center text-center"><ShieldCheck className="mb-1 h-[25px] w-[25px] fill-[#ff4b0b] text-white" /><strong className="text-[.58rem] leading-[1.15] sm:text-[.61rem]">Trusted<br />Brand</strong><span className="mt-1 text-[.52rem] leading-[1.25] text-[#47505b] sm:text-[.55rem]">Loved by thousands<br />of customers</span></div>
              <div className="flex flex-col items-center text-center"><Heart className="mb-1 h-[25px] w-[25px] fill-[#ff4b0b] text-white" /><strong className="text-[.58rem] leading-[1.15] sm:text-[.61rem]">Customer<br />First</strong><span className="mt-1 text-[.52rem] leading-[1.25] text-[#47505b] sm:text-[.55rem]">Your satisfaction<br />is our priority</span></div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="pb-3">
        <PageContainer className="grid grid-cols-2 items-center gap-y-3 rounded-[5px] bg-[#fff5ef] py-3 md:grid-cols-4">
          <div className="flex items-center justify-center gap-2 border-r border-[#f2e8e2] md:gap-3"><Users className="h-[23px] w-[23px] shrink-0 fill-[#ff4b0b] text-[#ff4b0b] sm:h-7 sm:w-7" /><p className="m-0 flex flex-col"><strong className="text-[1.1rem] font-extrabold leading-[1.05] text-[#ff4b0b] sm:text-[1.35rem]">50K+</strong><span className="mt-0.5 text-[.59rem] sm:text-[.67rem]">Happy Customers</span></p></div>
          <div className="flex items-center justify-center gap-2 md:gap-3 md:border-r md:border-[#f2e8e2]"><Box className="h-[23px] w-[23px] shrink-0 fill-[#ff4b0b] text-[#ff4b0b] sm:h-7 sm:w-7" /><p className="m-0 flex flex-col"><strong className="text-[1.1rem] font-extrabold leading-[1.05] text-[#ff4b0b] sm:text-[1.35rem]">1,000+</strong><span className="mt-0.5 text-[.59rem] sm:text-[.67rem]">Premium Products</span></p></div>
          <div className="flex items-center justify-center gap-2 border-r border-[#f2e8e2] md:gap-3"><Store className="h-[23px] w-[23px] shrink-0 fill-[#ff4b0b] text-[#ff4b0b] sm:h-7 sm:w-7" /><p className="m-0 flex flex-col"><strong className="text-[1.1rem] font-extrabold leading-[1.05] text-[#ff4b0b] sm:text-[1.35rem]">25+</strong><span className="mt-0.5 text-[.59rem] sm:text-[.67rem]">Brands</span></p></div>
          <div className="flex items-center justify-center gap-2 md:gap-3"><Star className="h-[23px] w-[23px] shrink-0 fill-[#ff4b0b] text-[#ff4b0b] sm:h-7 sm:w-7" /><p className="m-0 flex flex-col"><strong className="text-[1.1rem] font-extrabold leading-[1.05] text-[#ff4b0b] sm:text-[1.35rem]">4.8/5</strong><span className="mt-0.5 text-[.59rem] sm:text-[.67rem]">Customer Rating</span></p></div>
        </PageContainer>
      </section>

      <section>
        <PageContainer className="py-[18px]">
          <div className="mb-3 text-center">
            <Eyebrow centered>Our Collections</Eyebrow>
            <h2 className="m-0 text-[clamp(1.5rem,2.5vw,1.8rem)] font-extrabold leading-tight tracking-[-.035em]">Style for <span className="text-[#ff4b0b]">Every Journey</span></h2>
          </div>
          <div className="grid grid-cols-2 gap-2 min-[481px]:grid-cols-3 md:grid-cols-6 md:gap-[10px]">
            {collections.map((collection) => (
              <article className="min-w-0 overflow-hidden rounded-[5px] bg-[#fff6f1]" key={collection.name}>
                <div
                  className="aspect-[1.58] w-full bg-no-repeat"
                  role="img"
                  aria-label={collection.name}
                  style={{ backgroundImage: "url('/about/stylehub-reference.png')", backgroundSize: "100vw auto", backgroundPosition: collection.position }}
                />
                <div className="flex items-center justify-between gap-1 px-[6px] py-1.5 md:px-[7px]">
                  <div><h3 className="m-0 text-[.72rem] font-bold leading-[1.1] md:text-[.73rem]">{collection.name}</h3><p className="mb-0 mt-[3px] text-[.55rem] leading-[1.2]">{collection.description}</p></div>
                  <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[#ff4b0b] text-white"><ArrowRight size={15} /></span>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="bg-gradient-to-r from-[#fff8f3] to-[#fff2eb]">
        <PageContainer className="grid items-center gap-[18px] py-5 md:grid-cols-[.88fr_1.12fr] md:gap-[42px] md:py-[14px]">
          <div>
            <Eyebrow>Why Choose StyleHub</Eyebrow>
            <h2 className="m-0 text-[clamp(1.45rem,2.5vw,1.8rem)] font-extrabold leading-tight tracking-[-.035em]">Quality. Style. <span className="text-[#ff4b0b]">Trust.</span></h2>
            <p className="mt-[10px] text-[.85rem] leading-[1.55] text-[#252d38] md:text-[.76rem]">We are committed to delivering premium products, exceptional service and a seamless shopping experience. Every product is carefully selected to ensure the best quality and style for our customers.</p>
            <a href="/" className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#ff4b0b] px-[15px] py-[7px] text-[.65rem] font-bold text-white no-underline">Shop Now <ArrowRight size={15} /></a>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:gap-[10px]">
            {promises.map(({ title, description, icon: Icon }) => (
              <article className="flex min-h-[68px] items-center gap-3 rounded-[5px] bg-white p-[10px] md:px-[14px]" key={title}>
                <Icon className="h-[25px] w-[25px] shrink-0 text-[#ff4b0b] sm:h-[30px] sm:w-[30px]" strokeWidth={2.5} />
                <div><h3 className="m-0 text-[.66rem] font-bold">{title}</h3><p className="mb-0 mt-[3px] text-[.58rem] leading-[1.35] text-[#47505b]">{description}</p></div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section>
        <PageContainer className="grid items-center gap-[18px] py-[10px] md:grid-cols-[.92fr_1.08fr] md:gap-[26px]">
          <div
            className="aspect-[2.5] rounded"
            role="img"
            aria-label="Leather goods crafted by hand"
            style={{ backgroundImage: "url('/about/stylehub-reference.png')", backgroundSize: "100vw auto", backgroundPosition: "-3.2vw -104.7vw" }}
          />
          <div>
            <Eyebrow>Our Values</Eyebrow>
            <h2 className="mb-[10px] mt-0 text-[clamp(1.45rem,2.4vw,1.8rem)] font-extrabold leading-tight tracking-[-.035em]">What We <span className="text-[#ff4b0b]">Stand For</span></h2>
            <div className="grid grid-cols-3 gap-[7px] sm:gap-[10px]">
              <article className="flex flex-col items-start gap-2 min-[481px]:flex-row min-[481px]:items-center"><span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#fff0e5] text-[#ff4b0b] sm:h-[50px] sm:w-[50px]"><Leaf className="h-[25px] w-[25px]" /></span><div><h3 className="m-0 text-[.6rem] font-bold">Sustainability</h3><p className="mb-0 mt-[3px] text-[.55rem] leading-[1.35] text-[#47505b]">Eco-friendly materials and responsible sourcing.</p></div></article>
              <article className="flex flex-col items-start gap-2 min-[481px]:flex-row min-[481px]:items-center"><span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#fff0e5] text-[#ff4b0b] sm:h-[50px] sm:w-[50px]"><HeartHandshake className="h-[25px] w-[25px]" /></span><div><h3 className="m-0 text-[.6rem] font-bold">Inclusivity</h3><p className="mb-0 mt-[3px] text-[.55rem] leading-[1.35] text-[#47505b]">Styles for everyone, every occasion.</p></div></article>
              <article className="flex flex-col items-start gap-2 min-[481px]:flex-row min-[481px]:items-center"><span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full bg-[#fff0e5] text-[#ff4b0b] sm:h-[50px] sm:w-[50px]"><Award className="h-[25px] w-[25px]" /></span><div><h3 className="m-0 text-[.6rem] font-bold">Excellence</h3><p className="mb-0 mt-[3px] text-[.55rem] leading-[1.35] text-[#47505b]">Committed to superior quality and design.</p></div></article>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="bg-[#fff8f3]">
        <PageContainer className="grid items-center gap-3 py-[18px] md:grid-cols-[.85fr_2.15fr] md:gap-4 md:py-3">
          <div>
            <Eyebrow>What Our Customers Say</Eyebrow>
            <h2 className="m-0 text-[clamp(1.35rem,2.3vw,1.7rem)] font-extrabold leading-tight tracking-[-.035em]">Loved by <span className="text-[#ff4b0b]">Thousands</span></h2>
          </div>
          <div className="grid grid-cols-1 gap-[10px] min-[550px]:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article className="flex min-w-0 gap-2 rounded-md border border-[#f0e8e2] bg-white p-2" key={testimonial.name}>
                <div
                  className="h-10 w-10 shrink-0 rounded-full bg-no-repeat"
                  aria-hidden="true"
                  style={{ backgroundImage: "url('/about/stylehub-reference.png')", backgroundSize: "100vw auto", backgroundPosition: testimonial.position }}
                />
                <div className="min-w-0">
                  <div className="text-[.8rem] leading-none tracking-[.05em] text-[#ff4b0b]" aria-label="5 out of 5 stars">★★★★★</div>
                  <p className="my-1 min-h-[30px] text-[.57rem] leading-[1.3] text-[#333b45]">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center justify-between gap-1 text-[.53rem]">
                    <strong>{testimonial.name}</strong><span className="flex items-center gap-[3px] whitespace-nowrap text-[#38424c]"><BadgeCheck size={13} className="text-[#12a65a]" /> Verified Buyer</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="bg-gradient-to-r from-[#351506] to-[#6a2b0a] py-4 text-white md:py-[13px]">
        <PageContainer className="flex flex-col gap-3 min-[550px]:flex-row min-[550px]:items-center min-[550px]:justify-between min-[550px]:gap-5">
          <div>
            <h2 className="m-0 text-[1.2rem] font-extrabold sm:text-[1.35rem]">Join Our <span className="text-[#ff4b0b]">StyleHub</span> Family</h2>
            <p className="mb-0 mt-0.5 text-[.7rem]">Get the latest updates, exclusive offers and new arrivals.</p>
          </div>
          <form className="flex w-full rounded-full bg-white p-1 min-[550px]:w-[46%] min-[550px]:max-w-[390px]" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="about-newsletter-email">Email address</label>
            <input id="about-newsletter-email" type="email" placeholder="Enter your email address" className="min-w-0 flex-1 rounded-full border-0 px-[11px] py-[7px] text-[.65rem] text-[#242932] outline-none" />
            <button type="submit" className="flex shrink-0 items-center justify-center gap-1.5 rounded-full border-0 bg-[#ff4b0b] px-[17px] py-2 text-[.65rem] font-bold text-white">Subscribe <ArrowRight size={15} /></button>
          </form>
        </PageContainer>
      </section>
    </main>
  );
}
