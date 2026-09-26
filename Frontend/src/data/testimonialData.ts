export interface PlatformIcon {
  viewBox: string;
  path: string;
  label: string;
  width: number;
  height: number;
}

export const PLATFORM_ICONS: Record<string, PlatformIcon> = {
  reddit: {
    viewBox: "0 0 24 24",
    path: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z",
    label: "Reddit",
    width: 15,
    height: 15,
  },
  x: {
    viewBox: "0 0 11 10",
    path: "m.027 0 4.247 5.516L0 10h.962l3.742-3.926L7.727 10H11L6.514 4.174 10.492 0H9.53L6.084 3.616 3.3 0z",
    label: "X",
    width: 11,
    height: 10,
  },
  linkedin: {
    viewBox: "0 0 24 24",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
    label: "LinkedIn",
    width: 15,
    height: 15,
  },
};

export interface TestimonialCard {
  image: string;
  name: string;
  handle: string;
  date: string;
  platform: "reddit" | "x" | "linkedin" | string;
  testimonial: string;
  link: string;
}

export const testimonialCardsData: TestimonialCard[] = [
  {
    image: "/testimonial-icon.png",
    name: "Accurate_Maximum_974",
    handle: "u/Accurate_Maximum_974",
    date: "January 14, 2026",
    platform: "reddit",
    testimonial: "First of all. When i opened it up. I was amazed by design. Its really cool. Just a little too much maybe:) Other than that i didnt have time to test it but if it works good. It is good overall.",
    link: "https://www.reddit.com/r/WebDeveloperJobs/comments/1qgagz5/product_review/",
  },
  {
    image: "/testimonial-icon-1.jpg",
    name: "Sanchit Bajaj",
    handle: "@solitrix02",
    date: "January 20, 2026",
    platform: "x",
    testimonial: "Nice project..!! I tried your tool and it is good not exceptionally amazing but the response is good and better than raw prompting on gemini 3",
    link: "https://x.com/solitrix02/status/1880500306220726066",
  },
  {
    image: "/testimonial-icon-2.png",
    name: "Realistic-Middle7168",
    handle: "u/Realistic-Middle7168",
    date: "December 10, 2025",
    platform: "reddit",
    testimonial: "Just checked it out. The website and ui are really great.but just have a doubt since we can already generate cold emails using chat gpt or claude wil people be willing to use you app.the pricing is decent",
    link: "https://www.reddit.com/r/WebDeveloperJobs/comments/1qgagz5/product_review/",
  },
  {
    image: "/testimonial-icon-3.png",
    name: "Abhay Singh",
    handle: "@ThakurAbhay342",
    date: "January 20, 2026",
    platform: "x",
    testimonial: "This is really cool. I like the design and the functionality. I think it is a really good tool for cold emailing. I will definitely use it in the future. Thanks for creating this tool.",
    link: "https://x.com/ThakurAbhay342/status/1880500306220726066",
  },
  {
    image: "/testimonial-icon-4.png",
    name: "Priyanshu Ganatra",
    handle: "@priyanshu_ganatra",
    date: "June 21, 2025",
    platform: "linkedin",
    testimonial: "Yoo Krushna Sakhare great work! Awesome project 😎.",
    link: "https://www.linkedin.com/in/krushna-sakhare/recent-activity/all/",
  },
];
