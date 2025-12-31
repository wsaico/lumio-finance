
import {
    Utensils, Car, Home, PartyPopper, HeartPulse, GraduationCap, ShoppingBag,
    CircleHelp, Briefcase, TrendingUp, Wallet, Plane, Lightbulb, Music,
    Smartphone, Wifi, CreditCard, Banknote, DollarSign, PiggyBank,
    Coffee, Pizza, Beer, Gift, Hammer, Wrench, Bus, Train,
    Baby, Dog, Dumbbell, Stethoscope, Book, Monitor, Gamepad,
    Tags, User, Users, Shield, Lock, Key, MapPin, Flag, ShoppingCart,
    Shirt, Scissors, Gamepad2, Landmark, AlertTriangle, MoreHorizontal, Store, LineChart,
    Zap, Truck, BookOpen, Paintbrush, Fuel, CircleParking, CircleDollarSign, FileText, Film, Camera, Tv, HardDrive, Percent, TrendingDown, Bitcoin, Building, Award, HandHeart, MoreVertical
} from "lucide-react"

export const iconMap: Record<string, any> = {
    // Financial & Basics
    "wallet": Wallet,
    "banknote": Banknote,
    "dollar-sign": DollarSign,
    "credit-card": CreditCard,
    "piggy-bank": PiggyBank,
    "trending-up": TrendingUp,
    "briefcase": Briefcase,

    // Categories
    "utensils": Utensils,
    "coffee": Coffee,
    "pizza": Pizza,
    "beer": Beer,

    "car": Car,
    "bus": Bus,
    "train": Train,
    "plane": Plane,

    "home": Home,
    "lightbulb": Lightbulb,
    "wifi": Wifi,
    "hammer": Hammer,
    "wrench": Wrench,

    "shopping-bag": ShoppingBag,
    "shopping-cart": ShoppingCart,
    "gift": Gift,
    "tags": Tags,

    "heart-pulse": HeartPulse,
    "stethoscope": Stethoscope,
    "dumbbell": Dumbbell,

    "party-popper": PartyPopper,
    "music": Music,
    "gamepad": Gamepad,
    "ticket": Tags, // closest generic

    "graduation-cap": GraduationCap,
    "book": Book,
    "monitor": Monitor,
    "smartphone": Smartphone,

    "baby": Baby,
    "dog": Dog,
    "user": User,
    "users": Users,

    "circle-help": CircleHelp,
    "shield": Shield,
    "lock": Lock,
    "key": Key,
    "map-pin": MapPin,
    "flag": Flag,

    // MISSING FIXES
    "shirt": Shirt,
    "scissors": Scissors,
    "gamepad-2": Gamepad2,
    "landmark": Landmark,
    "alert-triangle": AlertTriangle,
    "more-horizontal": MoreHorizontal,
    "store": Store,
    "line-chart": LineChart,

    // NEW MAPPINGS from USER SPEC
    "zap": Zap,
    "truck": Truck,
    "book-open": BookOpen,
    "paintbrush": Paintbrush,
    "fuel": Fuel,
    "circle-parking": CircleParking,
    "circle-dollar-sign": CircleDollarSign,
    "file-text": FileText,
    "film": Film,
    "camera": Camera,
    "tv": Tv,
    "hard-drive": HardDrive,
    "percent": Percent,
    "trending-down": TrendingDown,
    "bitcoin": Bitcoin,
    "building": Building,
    "award": Award,
    "hand-heart": HandHeart,
    "more-vertical": MoreVertical,
}

interface IconProps {
    name: string
    className?: string
}

export function CategoryIcon({ name, className }: IconProps) {
    const IconComponent = iconMap[name] || CircleHelp // Default fallback
    return <IconComponent className={className} />
}
