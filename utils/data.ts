import { Product, Category, Banner, DealOfTheDay, Doctor, Pharmacy } from '../types';
import banner1 from "@/assets/images/Bancobu4.png";
import banner2 from "@/assets/images/Bancobu3.png";
import banner3 from "@/assets/images/Bancobu4.png";
import banner4 from "@/assets/images/Bancobu2.png";

export const products: Product[] = [
  // Category 1: Headache
  {
    id: 'm1',
    title: 'Paracetamol 500mg Tablets',
    price: 50,
    originalPrice: 70,
    discountPercentage: 28,
    ratingCount: 1200,
    image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Paracetamol 500mg Tablets',
    categoryId: '1',
    description: 'Effective for relieving mild to moderate pain and reducing fever.',
   pharmacies: [
      {
        name: 'MediMart',
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm2',
    title: 'Ibuprofen 200mg Tablets',
    price: 80,
    originalPrice: 100,
    discountPercentage: 20,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Ibuprofen 200mg Tablets',
    categoryId: '1',
    description: 'NSAID for pain relief and reducing inflammation.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm3',
    title: 'Aspirin 75mg Tablets',
    price: 45,
    originalPrice: 60,
    discountPercentage: 25,
    ratingCount: 750,
    image: 'https://images.pexels.com/photos/3683076/pexels-photo-3683076.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Aspirin 75mg Tablets',
    categoryId: '1',
    description: 'For pain relief and blood thinning at low doses.',
   pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm4',
    title: 'Migraine Relief Capsules',
    price: 120,
    originalPrice: 150,
    discountPercentage: 20,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/3683077/pexels-photo-3683077.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Migraine Relief Capsules',
    categoryId: '1',
    description: 'Special formula for migraine headache relief.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm5',
    title: 'Tension Headache Relief',
    price: 95,
    originalPrice: 110,
    discountPercentage: 13,
    ratingCount: 600,
    image: 'https://images.pexels.com/photos/3683078/pexels-photo-3683078.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Tension Headache Relief',
    categoryId: '1',
    description: 'For relief of tension headaches and muscle pain.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm6',
    title: 'Sinus Headache Formula',
    price: 110,
    originalPrice: 130,
    discountPercentage: 15,
    ratingCount: 700,
    image: 'https://images.pexels.com/photos/3683079/pexels-photo-3683079.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Sinus Headache Formula',
    categoryId: '1',
    description: 'Relieves sinus pressure and headache symptoms.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 2: Cough & Cold
  {
    id: 'm7',
    title: 'Cough Syrup 100ml',
    price: 80,
    originalPrice: 100,
    discountPercentage: 20,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/7615460/pexels-photo-7615460.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Cough Syrup 100ml',
    categoryId: '2',
    description: 'Soothes dry and tickly coughs.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm8',
    title: 'Decongestant Nasal Spray',
    price: 65,
    originalPrice: 80,
    discountPercentage: 18,
    ratingCount: 720,
    image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Decongestant Nasal Spray',
    categoryId: '2',
    description: 'Fast relief from nasal congestion.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm9',
    title: 'Cold & Flu Tablets',
    price: 90,
    originalPrice: 120,
    discountPercentage: 25,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/7615462/pexels-photo-7615462.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Cold & Flu Tablets',
    categoryId: '2',
    description: 'Multi-symptom relief for cold and flu.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm10',
    title: 'Sore Throat Lozenges',
    price: 45,
    originalPrice: 60,
    discountPercentage: 25,
    ratingCount: 680,
    image: 'https://images.pexels.com/photos/7615463/pexels-photo-7615463.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Sore Throat Lozenges',
    categoryId: '2',
    description: 'Soothes and numbs sore throat pain.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm11',
    title: 'Chesty Cough Medicine',
    price: 75,
    originalPrice: 90,
    discountPercentage: 16,
    ratingCount: 820,
    image: 'https://images.pexels.com/photos/7615464/pexels-photo-7615464.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Chesty Cough Medicine',
    categoryId: '2',
    description: 'Helps loosen phlegm and ease chesty coughs.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm12',
    title: 'Night Time Cold Relief',
    price: 100,
    originalPrice: 120,
    discountPercentage: 16,
    ratingCount: 780,
    image: 'https://images.pexels.com/photos/7615465/pexels-photo-7615465.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Night Time Cold Relief',
    categoryId: '2',
    description: 'Helps relieve symptoms so you can sleep.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 3: Digestive Health
  {
    id: 'm13',
    title: 'Antacid Tablets',
    price: 60,
    originalPrice: 80,
    discountPercentage: 25,
    ratingCount: 600,
    image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Antacid Tablets',
    categoryId: '3',
    description: 'Fast relief from heartburn and indigestion.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm14',
    title: 'Probiotic Capsules',
    price: 150,
    originalPrice: 180,
    discountPercentage: 16,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/7615466/pexels-photo-7615466.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Probiotic Capsules',
    categoryId: '3',
    description: 'Supports healthy gut bacteria balance.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm15',
    title: 'Digestive Enzymes',
    price: 110,
    originalPrice: 130,
    discountPercentage: 15,
    ratingCount: 720,
    image: 'https://images.pexels.com/photos/7615467/pexels-photo-7615467.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Digestive Enzymes',
    categoryId: '3',
    description: 'Aids digestion of proteins, fats and carbs.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm16',
    title: 'Fiber Supplement',
    price: 85,
    originalPrice: 100,
    discountPercentage: 15,
    ratingCount: 650,
    image: 'https://images.pexels.com/photos/7615468/pexels-photo-7615468.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Fiber Supplement',
    categoryId: '3',
    description: 'Promotes regular bowel movements.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm17',
    title: 'Anti-Diarrheal Tablets',
    price: 70,
    originalPrice: 85,
    discountPercentage: 17,
    ratingCount: 580,
    image: 'https://images.pexels.com/photos/7615469/pexels-photo-7615469.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Anti-Diarrheal Tablets',
    categoryId: '3',
    description: 'Fast relief from diarrhea symptoms.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm18',
    title: 'Ginger Stomach Settler',
    price: 55,
    originalPrice: 70,
    discountPercentage: 21,
    ratingCount: 890,
    image: 'https://images.pexels.com/photos/7615470/pexels-photo-7615470.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Ginger Stomach Settler',
    categoryId: '3',
    description: 'Natural relief for nausea and upset stomach.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 4: Vitamins & Supplements
  {
    id: 'm19',
    title: 'Vitamin C Supplements',
    price: 150,
    originalPrice: 200,
    discountPercentage: 25,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Vitamin C Supplements',
    categoryId: '4',
    description: 'Boosts immune system and collagen production.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm20',
    title: 'Multivitamin Capsules',
    price: 200,
    originalPrice: 250,
    discountPercentage: 20,
    ratingCount: 1100,
    image: 'https://images.pexels.com/photos/7615462/pexels-photo-7615462.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Multivitamin Capsules',
    categoryId: '4',
    description: 'Complete daily vitamin and mineral support.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm21',
    title: 'Vitamin D3 1000IU',
    price: 120,
    originalPrice: 150,
    discountPercentage: 20,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/7615471/pexels-photo-7615471.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Vitamin D3 1000IU',
    categoryId: '4',
    description: 'Supports bone health and immune function.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm22',
    title: 'Omega-3 Fish Oil',
    price: 180,
    originalPrice: 220,
    discountPercentage: 18,
    ratingCount: 980,
    image: 'https://images.pexels.com/photos/7615472/pexels-photo-7615472.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Omega-3 Fish Oil',
    categoryId: '4',
    description: 'Supports heart and brain health.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm23',
    title: 'Calcium + Magnesium',
    price: 130,
    originalPrice: 160,
    discountPercentage: 18,
    ratingCount: 750,
    image: 'https://images.pexels.com/photos/7615473/pexels-photo-7615473.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Calcium + Magnesium',
    categoryId: '4',
    description: 'Supports bone strength and muscle function.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm24',
    title: 'B-Complex Vitamins',
    price: 95,
    originalPrice: 120,
    discountPercentage: 20,
    ratingCount: 680,
    image: 'https://images.pexels.com/photos/7615474/pexels-photo-7615474.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'B-Complex Vitamins',
    categoryId: '4',
    description: 'Supports energy production and metabolism.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 5: Allergy Relief
  {
    id: 'm25',
    title: 'Allergy Relief Tablets',
    price: 90,
    originalPrice: 120,
    discountPercentage: 25,
    ratingCount: 700,
    image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Allergy Relief Tablets',
    categoryId: '5',
    description: '24-hour relief from allergy symptoms.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm26',
    title: 'Antihistamine Tablets',
    price: 75,
    originalPrice: 90,
    discountPercentage: 16,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/7615475/pexels-photo-7615475.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Antihistamine Tablets',
    categoryId: '5',
    description: 'Relieves sneezing, runny nose and itchy eyes.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm27',
    title: 'Nasal Allergy Spray',
    price: 110,
    originalPrice: 130,
    discountPercentage: 15,
    ratingCount: 720,
    image: 'https://images.pexels.com/photos/7615476/pexels-photo-7615476.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Nasal Allergy Spray',
    categoryId: '5',
    description: 'Targeted relief for nasal allergy symptoms.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm28',
    title: 'Eye Allergy Drops',
    price: 65,
    originalPrice: 80,
    discountPercentage: 18,
    ratingCount: 680,
    image: 'https://images.pexels.com/photos/7615477/pexels-photo-7615477.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Eye Allergy Drops',
    categoryId: '5',
    description: 'Fast relief for itchy, watery eyes.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm29',
    title: 'Child Allergy Syrup',
    price: 85,
    originalPrice: 100,
    discountPercentage: 15,
    ratingCount: 620,
    image: 'https://images.pexels.com/photos/7615478/pexels-photo-7615478.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Child Allergy Syrup',
    categoryId: '5',
    description: 'Gentle formula for children with allergies.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm30',
    title: 'Natural Allergy Relief',
    price: 95,
    originalPrice: 120,
    discountPercentage: 20,
    ratingCount: 780,
    image: 'https://images.pexels.com/photos/7615479/pexels-photo-7615479.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Natural Allergy Relief',
    categoryId: '5',
    description: 'Herbal formula for allergy symptoms.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 6: Pain Relief
  {
    id: 'm31',
    title: 'Extra Strength Pain Reliever',
    price: 100,
    originalPrice: 130,
    discountPercentage: 23,
    ratingCount: 920,
    image: 'https://images.pexels.com/photos/7615480/pexels-photo-7615480.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Extra Strength Pain Reliever',
    categoryId: '6',
    description: 'For moderate to severe pain relief.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm32',
    title: 'Muscle Pain Cream',
    price: 70,
    originalPrice: 90,
    discountPercentage: 22,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/7615481/pexels-photo-7615481.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Muscle Pain Cream',
    categoryId: '6',
    description: 'Topical relief for sore muscles and joints.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm33',
    title: 'Arthritis Pain Relief',
    price: 120,
    originalPrice: 150,
    discountPercentage: 20,
    ratingCount: 780,
    image: 'https://images.pexels.com/photos/7615482/pexels-photo-7615482.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Arthritis Pain Relief',
    categoryId: '6',
    description: 'Specially formulated for joint pain relief.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm34',
    title: 'Back Pain Relief Patches',
    price: 85,
    originalPrice: 110,
    discountPercentage: 22,
    ratingCount: 720,
    image: 'https://images.pexels.com/photos/7615483/pexels-photo-7615483.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Back Pain Relief Patches',
    categoryId: '6',
    description: 'Long-lasting pain relief with heat therapy.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm35',
    title: 'Migraine Relief Tablets',
    price: 110,
    originalPrice: 140,
    discountPercentage: 21,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/7615484/pexels-photo-7615484.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Migraine Relief Tablets',
    categoryId: '6',
    description: 'Fast-acting formula for migraine relief.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm36',
    title: 'Period Pain Relief',
    price: 65,
    originalPrice: 80,
    discountPercentage: 18,
    ratingCount: 880,
    image: 'https://images.pexels.com/photos/7615485/pexels-photo-7615485.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Period Pain Relief',
    categoryId: '6',
    description: 'Targeted relief for menstrual cramps.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 7: Skin Care
  {
    id: 'm37',
    title: 'Acne Treatment Cream',
    price: 90,
    originalPrice: 120,
    discountPercentage: 25,
    ratingCount: 950,
    image: 'https://images.pexels.com/photos/7615486/pexels-photo-7615486.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Acne Treatment Cream',
    categoryId: '7',
    description: 'Clinically proven to fight acne bacteria.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm38',
    title: 'Eczema Relief Ointment',
    price: 110,
    originalPrice: 140,
    discountPercentage: 21,
    ratingCount: 820,
    image: 'https://images.pexels.com/photos/7615487/pexels-photo-7615487.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Eczema Relief Ointment',
    categoryId: '7',
    description: 'Soothes dry, itchy, irritated skin.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm39',
    title: 'Antifungal Cream',
    price: 75,
    originalPrice: 95,
    discountPercentage: 21,
    ratingCount: 780,
    image: 'https://images.pexels.com/photos/7615488/pexels-photo-7615488.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Antifungal Cream',
    categoryId: '7',
    description: 'Treats athlete\'s foot and ringworm.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm40',
    title: 'Psoriasis Treatment',
    price: 130,
    originalPrice: 160,
    discountPercentage: 18,
    ratingCount: 680,
    image: 'https://images.pexels.com/photos/7615489/pexels-photo-7615489.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Psoriasis Treatment',
    categoryId: '7',
    description: 'Helps relieve scaling and redness.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm41',
    title: 'Moisturizing Lotion',
    price: 65,
    originalPrice: 85,
    discountPercentage: 23,
    ratingCount: 920,
    image: 'https://images.pexels.com/photos/7615490/pexels-photo-7615490.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Moisturizing Lotion',
    categoryId: '7',
    description: 'For dry, sensitive skin.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm42',
    title: 'Sunscreen SPF 50',
    price: 95,
    originalPrice: 120,
    discountPercentage: 20,
    ratingCount: 1050,
    image: 'https://images.pexels.com/photos/7615491/pexels-photo-7615491.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Sunscreen SPF 50',
    categoryId: '7',
    description: 'Broad spectrum UVA/UVB protection.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },

  // Category 8: Heart Health
  {
    id: 'm43',
    title: 'Blood Pressure Support',
    price: 120,
    originalPrice: 150,
    discountPercentage: 20,
    ratingCount: 850,
    image: 'https://images.pexels.com/photos/7615492/pexels-photo-7615492.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Blood Pressure Support',
    categoryId: '8',
    description: 'Supports healthy blood pressure levels.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm44',
    title: 'Cholesterol Management',
    price: 140,
    originalPrice: 180,
    discountPercentage: 22,
    ratingCount: 780,
    image: 'https://images.pexels.com/photos/7615493/pexels-photo-7615493.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Cholesterol Management',
    categoryId: '8',
    description: 'Helps maintain healthy cholesterol levels.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm45',
    title: 'Omega-3 Heart Health',
    price: 160,
    originalPrice: 200,
    discountPercentage: 20,
    ratingCount: 920,
    image: 'https://images.pexels.com/photos/7615494/pexels-photo-7615494.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Omega-3 Heart Health',
    categoryId: '8',
    description: 'Supports cardiovascular health.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm46',
    title: 'CoQ10 Supplements',
    price: 130,
    originalPrice: 160,
    discountPercentage: 18,
    ratingCount: 750,
    image: 'https://images.pexels.com/photos/7615495/pexels-photo-7615495.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'CoQ10 Supplements',
    categoryId: '8',
    description: 'Antioxidant for heart health.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm47',
    title: 'Magnesium for Heart',
    price: 95,
    originalPrice: 120,
    discountPercentage: 20,
    ratingCount: 680,
    image: 'https://images.pexels.com/photos/7615496/pexels-photo-7615496.jpeg',
    isFreeDelivery: true,
    isAssured: true,
    name: 'Magnesium for Heart',
    categoryId: '8',
    description: 'Supports normal heart rhythm.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  },
  {
    id: 'm48',
    title: 'Garlic Heart Support',
    price: 75,
    originalPrice: 95,
    discountPercentage: 21,
    ratingCount: 820,
    image: 'https://images.pexels.com/photos/7615497/pexels-photo-7615497.jpeg',
    isFreeDelivery: true,
    isAssured: false,
    name: 'Garlic Heart Support',
    categoryId: '8',
    description: 'Traditional support for cardiovascular health.',
    pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '11',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '12',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '13',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: 'Gitega',
        medicines: []
      },
    ],
  }
];

export const categories: Category[] = [
  { id: '1', name: 'Headache', icon: '🤕' },
  { id: '2', name: 'Cough & Cold', icon: '🤧' },
  { id: '3', name: 'Digestive Health', icon: '🤢' },
  { id: '4', name: 'Vitamins & Supplements', icon: '💊' },
  { id: '5', name: 'Allergy Relief', icon: '🌼' },
  { id: '6', name: 'Pain Relief', icon: '💥' },
  { id: '7', name: 'Skin Care', icon: '🧴' },
  { id: '8', name: 'Heart Health', icon: '❤️' }
];

export const banners: Banner[] = [
  {
    id: '1',
    image: banner1,
    link: '#',
    wrapperStyle: { backgroundColor: "#eee", borderRadius: 20 },
  },
  {
    id: '2',
    image: banner2,
    link: '#',
    wrapperStyle: { backgroundColor: "#eee", borderRadius: 20 },
  },
  {
    id: '3',
    image: banner3,
    link: '#',
    wrapperStyle: { backgroundColor: "#eee", borderRadius: 20 },
  },
  {
    id: '4',
    image: banner4,
    link: '#',
    wrapperStyle: { backgroundColor: "#eee", borderRadius: 20 },
  }
];

export const dealsOfTheDay: DealOfTheDay[] = [
  {
    id: '1',
    title: 'Pain Relief Essentials',
    discount: 'Up to 30% Off',
    image: 'https://images.pexels.com/photos/7615467/pexels-photo-7615467.jpeg?auto=compress&cs=tinysrgb&w=600',
    tagline: 'Ease Your Pain Today!'
  },
  {
    id: '2',
    title: 'Cold & Flu Remedies',
    discount: 'Flat 25% Off',
    image: 'https://images.pexels.com/photos/7615468/pexels-photo-7615468.jpeg?auto=compress&cs=tinysrgb&w=600',
    tagline: 'Stay Healthy!'
  },
  {
    id: '3',
    title: 'Digestive Health Pack',
    discount: 'Save 20%',
    image: 'https://images.pexels.com/photos/7615469/pexels-photo-7615469.jpeg?auto=compress&cs=tinysrgb&w=600',
    tagline: 'Feel Better Fast!'
  },
  {
    id: '4',
    title: 'Vitamin Boosters',
    discount: 'Up to 35% Off',
    image: 'https://images.pexels.com/photos/7615470/pexels-photo-7615470.jpeg?auto=compress&cs=tinysrgb&w=600',
    tagline: 'Boost Your Immunity!'
  }
];

export const featuredPharmacies = [
  {
    id: '1',
    name: 'MediPlus Pharmacy',
    image: 'https://images.pexels.com/photos/4225923/pexels-photo-4225923.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
     medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      },
       {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
    ]
  },
  {
    id: '2',
    name: 'HealthCare Drugs',
    image: 'https://images.pexels.com/photos/3952222/pexels-photo-3952222.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
     medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      },
       {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
    ]
  },
  {
    id: '3',
    name: 'CityMed Store',
    image: 'https://images.pexels.com/photos/5998454/pexels-photo-5998454.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
     medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      },
       {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
    ]
  },
  {
    id: '4',
    name: 'Wellness Pharmacy',
    image: 'https://images.pexels.com/photos/4226763/pexels-photo-4226763.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
     medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      },
       {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
    ]
  },
];

export const allPharmacies = [
  ...featuredPharmacies,
  {
    id: '5',
    name: 'Green Pharmacy',
    image: 'https://images.pexels.com/photos/4386464/pexels-photo-4386464.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
    medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      }
    ]
  },
  {
    id: '6',
    name: 'CareFirst Drugs',
    image: 'https://images.pexels.com/photos/4047001/pexels-photo-4047001.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
    medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60,
        pharmacies: [
      {
        name: 'MediMart', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '40',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
       
      },
      {
        name: 'HealthPlus', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '29',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
      
      },
      {
        name: 'CureWell', 
        insurances: ['MediCare', 'HealthNet', 'CarePlus'],
        id: '30',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
       
      },
    ],
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      }
    ]
  },
  {
    id: '7',
    name: 'TrustMeds',
    image: 'https://images.pexels.com/photos/4021802/pexels-photo-4021802.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
    medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      }
    ]
  },
  {
    id: '8',
    name: 'SafeLife Pharma',
    image: 'https://images.pexels.com/photos/3845125/pexels-photo-3845125.jpeg',
    location: 'Downtown',
    insurances: ['Aetna', 'Blue Cross'],
    medicines: [
      {
        id: 'm1',
        name: 'Paracetamol 500mg',
        description: 'Relieves mild to moderate pain and fever.',
        image: 'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 50
      },
      {
        id: 'm2',
        name: 'Benadryl Syrup',
        description: 'Soothes cough and sore throat.',
        image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 80
      },
      {
        id: 'm3',
        name: 'Antacid Tablets',
        description: 'Relieves heartburn and indigestion.',
        image: 'https://images.pexels.com/photos/3683073/pexels-photo-3683073.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 60
      },
      {
        id: 'm4',
        name: 'Vitamin C 1000mg',
        description: 'Boosts immunity and supports overall health.',
        image: 'https://images.pexels.com/photos/7615461/pexels-photo-7615461.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 150
      },
      {
        id: 'm5',
        name: 'Allergy Relief',
        description: 'Reduces allergy symptoms like sneezing and itching.',
        image: 'https://images.pexels.com/photos/3683075/pexels-photo-3683075.jpeg?auto=compress&cs=tinysrgb&w=600',
        price: 90
      }
    ]
  },
];

export const featuredHospitals = [
  {
    id: '1',
    name: 'City General Hospital',
    image: 'https://images.pexels.com/photos/7088521/pexels-photo-7088521.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '2',
    name: 'WellCare Medical Center',
    image: 'https://images.pexels.com/photos/7583386/pexels-photo-7583386.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '3',
    name: 'Metro Health Institute',
    image: 'https://images.pexels.com/photos/1250655/pexels-photo-1250655.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '4',
    name: 'Hope Hospital',
    image: 'https://images.pexels.com/photos/236380/pexels-photo-236380.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
];

export const allHospitals = [
  ...featuredHospitals,
  {
    id: '5',
    name: 'Unity Healthcare',
    image: 'https://images.pexels.com/photos/1170979/pexels-photo-1170979.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '6',
    name: 'Saint Mary Hospital',
    image: 'https://images.pexels.com/photos/1250657/pexels-photo-1250657.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '7',
    name: 'Sunrise Medical Center',
    image: 'https://images.pexels.com/photos/1250657/pexels-photo-1250657.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
  {
    id: '8',
    name: 'PrimeCare Hospital',
    image: 'https://images.pexels.com/photos/3844581/pexels-photo-3844581.jpeg',
    location: 'Downtown',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
    insurances: ['SafeHealth Insurance', 'MediCover Plan', 'Family Shield'],
    bloodTypes: ['A+', 'A-', 'B+', 'O+', 'O-'],
  },
];

export const featuredInsurances = [
  {
    id: '1',
    name: 'SafeHealth Insurance',
    image: 'https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', 
            price: 200, 
            description: 'Comprehensive coverage with low deductibles.',
            coverage: ['Hospitalization', 'Outpatient', 'Dental']
          
          },
          { type: 'silver',
            price: 120, 
            description: 'Balanced coverage with moderate deductibles.',
            coverage: ['Hospitalization', 'Outpatient', 'Dental']
          },
            
          
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', 
            price: 210, 
            description: 'Full coverage with specialist access.',
            coverage: ['Hospitalization', 'Outpatient', 'Dental'] 
          },
          { type: 'silver', 
            price: 130, 
            description: 'Standard coverage with basic specialist access.',
            coverage: ['Hospitalization', 'Outpatient', 'Dental'] 
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'MediCover Plan',
    image: 'https://images.pexels.com/photos/4386463/pexels-photo-4386463.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
         { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Family Shield',
    image: 'https://images.pexels.com/photos/4386462/pexels-photo-4386462.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
  {
    id: '4',
    name: 'SecureCare',
    image: 'https://images.pexels.com/photos/4386461/pexels-photo-4386461.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
];

export const allInsurances = [
  ...featuredInsurances,
  {
    id: '5',
    name: 'LifeSafe Insurance',
    image: 'https://images.pexels.com/photos/4386460/pexels-photo-4386460.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
  {
    id: '6',
    name: 'Total Wellness Cover',
    image: 'https://images.pexels.com/photos/4386459/pexels-photo-4386459.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
  {
    id: '7',
    name: 'HealthGuard Plan',
    image: 'https://images.pexels.com/photos/4386458/pexels-photo-4386458.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
  {
    id: '8',
    name: 'TrustCare Insurance',
    image: 'https://images.pexels.com/photos/4386457/pexels-photo-4386457.jpeg',
    locations: [
      {
        location: 'Downtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
      {
        location: 'Midtown',
        plans: [
          { type: 'premium', price: 200, description: 'Best coverage', coverage: ['Dental', 'Vision', 'General'] },
          { type: 'silver', price: 100, description: 'Good coverage', coverage: ['General'] },
        ],
      },
    ],
  },
];

// In @/utils/data.ts

export const featuredDoctors = [
  {
    id: 'doc1',
    name: 'Dr. Aisha Khan',
    image: require('../assets/images/Doctor1.jpg'),
    location: 'Medico Health, NY',
    specialty: 'Cardiologist',
  },
  {
    id: 'doc2',
    name: 'Dr. John Smith',
    image: require('../assets/images/Doctor2.jpg'),
    location: 'WellCare Clinic, LA',
    specialty: 'Dermatologist',
  },
  {
    id: 'doc3',
    name: 'Dr. Emily Zhang',
    image: require('../assets/images/Doctor3.jpg'),
    location: 'City Hospital, Chicago',
    specialty: 'Eye Specialist',
  },
  {
    id: 'doc4',
    name: 'Dr. Carlos Diaz',
    image: require('../assets/images/Doctor4.jpg'),
    location: 'Sunrise Medical, Miami',
    specialty: 'Pediatrician',
  },
];

export const allDoctors: Doctor[] = [
  ...featuredDoctors,
  {
    id: 'doc5',
    name: 'Dr. Aisha Khan',
    image: require('../assets/images/Doctor1.jpg'),
    location: 'Medico Health, NY',
    specialty: 'Cardiologist',
  },
  {
    id: 'doc6',
    name: 'Dr. John Smith',
    image: require('../assets/images/Doctor2.jpg'),
    location: 'WellCare Clinic, LA',
    specialty: 'Dermatologist',
  },
  {
    id: 'doc7',
    name: 'Dr. Emily Zhang',
    image: require('../assets/images/Doctor3.jpg'),
    location: 'City Hospital, Chicago',
    specialty: 'Eye Specialist',
  },
  {
    id: 'doc8',
    name: 'Dr. Carlos Diaz',
    image: require('../assets/images/Doctor4.jpg'),
    location: 'Sunrise Medical, Miami',
    specialty: 'Pediatrician',
  },
  {
    id: 'doc9',
    name: 'Dr. Aisha Khan',
    image: require('../assets/images/Doctor1.jpg'),
    location: 'Medico Health, NY',
    specialty: 'Cardiologist',
  },
  {
    id: 'doc10',
    name: 'Dr. John Smith',
    image: require('../assets/images/Doctor2.jpg'),
    location: 'WellCare Clinic, LA',
    specialty: 'Dermatologist',
  },
  {
    id: 'doc11',
    name: 'Dr. Emily Zhang',
    image: require('../assets/images/Doctor3.jpg'),
    location: 'City Hospital, Chicago',
    specialty: 'Eye Specialist',
  },
  {
    id: 'doc12',
    name: 'Dr. Carlos Diaz',
    image: require('../assets/images/Doctor4.jpg'),
    location: 'Sunrise Medical, Miami',
    specialty: 'Pediatrician',
  },
];


export const medicinesByCategory: Record<string, any[]> = {
  '1': [
    {
      id: 'h1',
      name: 'Paracetamol',
      description: 'Effective for fever and mild headache.',
      image: 'https://images.pexels.com/photos/3873188/pexels-photo-3873188.jpeg',
    },
    // ...14 more for Headache
  ],
  '2': [
    {
      id: 'c1',
      name: 'Benadryl',
      description: 'Soothes cough and sore throat.',
      image: 'https://images.pexels.com/photos/7615578/pexels-photo-7615578.jpeg',
    },
    // ...14 more for Cough & Cold
  ],
  // Add 15 medicines for each of the 8 categories
};

export const getHospitalsByMedicineCategory = (category: string) => {
  const hospitalMedicines = {
    diabetes: [
      { id: 'hosp1', name: 'City General Hospital', description: 'Comprehensive care' },
      { id: 'hosp2', name: 'Metro Health', description: 'Advanced medical services' },
    ],
    blood: [
      { id: 'hosp1', name: 'City General Hospital', description: 'Comprehensive care' },
    ],
  };
  return hospitalMedicines[category as keyof typeof hospitalMedicines] || [];
};

export const productsByCategory: Record<string, Product[]> = {
  '1': products.filter(p => p.categoryId === '1'),
  '2': products.filter(p => p.categoryId === '2'),
  '3': products.filter(p => p.categoryId === '3'),
  '4': products.filter(p => p.categoryId === '4'),
  '5': products.filter(p => p.categoryId === '5'),
  '6': products.filter(p => p.categoryId === '6'),
  '7': products.filter(p => p.categoryId === '7'),
  '8': products.filter(p => p.categoryId === '8')
};



