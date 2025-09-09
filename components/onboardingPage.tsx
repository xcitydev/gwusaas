"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  MapPin,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const steps = [
  {
    title: "Personal Information",
    description: "Tell us about yourself",
    icon: User,
    fields: ["firstName", "lastName", "email", "phone"],
  },
  {
    title: "Company Details",
    description: "Information about your business",
    icon: Building2,
    fields: ["companyName", "industry", "website", "companySize"],
  },
  {
    title: "Location & Preferences",
    description: "Where are you located?",
    icon: MapPin,
    fields: ["address", "city", "state", "zipCode"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "",
    website: "",
    companySize: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const onboardingCompleted = useMutation(api.users.completeOnboarding);

  const [completedFields, setCompletedFields] = useState<Set<string>>(
    new Set()
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Track completed fields
    if (value.trim()) {
      setCompletedFields((prev) => new Set([...prev, field]));
    } else {
      setCompletedFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
  };

  const nextStep = () => {
    if (
      currentStep === 0 &&
      (!formData.firstName ||
        !formData.lastName ||
        !formData.email ||
        !formData.phone)
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      console.log(currentStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!user || !isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (
      currentStep === 2 &&
      (!formData.address ||
        !formData.city ||
        !formData.state ||
        !formData.zipCode)
    ) {
      toast.error(`Please fill in all fields`);
      return;
    }
    setIsLoading(true);
    const status = await onboardingCompleted({
      clerkUserId: user.id,
      ...formData,
    });
    if (status.success) {
      toast.success(`Onboarding completed successfully`);
      router.push("/dashboard");
    } else {
      toast.error(`Onboarding failed`);
    }
    setIsLoading(false);
    // Here you would typically send the data to your API to create the GHL sub-account
    console.log("Creating GHL sub-account with data:", formData);
  };

  const renderStepContent = () => {
    const inputVariants = {
      focus: { scale: 1.02, transition: { duration: 0.2 } },
      blur: { scale: 1, transition: { duration: 0.2 } },
    };

    switch (currentStep) {
      case 0:
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label
                  htmlFor="firstName"
                  className="text-foreground flex items-center"
                >
                  First Name
                  {completedFields.has("firstName") && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    </motion.div>
                  )}
                </Label>
                <motion.div variants={inputVariants} whileFocus="focus">
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="John"
                  />
                </motion.div>
              </motion.div>
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label
                  htmlFor="lastName"
                  className="text-foreground flex items-center"
                >
                  Last Name
                  {completedFields.has("lastName") && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    </motion.div>
                  )}
                </Label>
                <motion.div variants={inputVariants} whileFocus="focus">
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Doe"
                  />
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label
                htmlFor="email"
                className="text-foreground flex items-center"
              >
                Email Address
                {completedFields.has("email") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="john@company.com"
                />
              </motion.div>
            </motion.div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label
                htmlFor="phone"
                className="text-foreground flex items-center"
              >
                Phone Number
                {completedFields.has("phone") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="+1 (555) 123-4567"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label
                htmlFor="companyName"
                className="text-foreground flex items-center"
              >
                Company Name
                {completedFields.has("companyName") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Acme Corporation"
                />
              </motion.div>
            </motion.div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label
                htmlFor="industry"
                className="text-foreground flex items-center"
              >
                Industry
                {completedFields.has("industry") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) =>
                    handleInputChange("industry", e.target.value)
                  }
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Technology, Healthcare, etc."
                />
              </motion.div>
            </motion.div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label
                htmlFor="website"
                className="text-foreground flex items-center"
              >
                Website
                {completedFields.has("website") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="https://www.company.com"
                />
              </motion.div>
            </motion.div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label
                htmlFor="companySize"
                className="text-foreground flex items-center"
              >
                Company Size
                {completedFields.has("companySize") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="companySize"
                  value={formData.companySize}
                  onChange={(e) =>
                    handleInputChange("companySize", e.target.value)
                  }
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="1-10, 11-50, 51-200, etc."
                />
              </motion.div>
            </motion.div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label
                htmlFor="address"
                className="text-foreground flex items-center"
              >
                Street Address
                {completedFields.has("address") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="123 Main Street"
                />
              </motion.div>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Label
                  htmlFor="city"
                  className="text-foreground flex items-center"
                >
                  City
                  {completedFields.has("city") && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    </motion.div>
                  )}
                </Label>
                <motion.div variants={inputVariants} whileFocus="focus">
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="New York"
                  />
                </motion.div>
              </motion.div>
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label
                  htmlFor="state"
                  className="text-foreground flex items-center"
                >
                  State
                  {completedFields.has("state") && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                    </motion.div>
                  )}
                </Label>
                <motion.div variants={inputVariants} whileFocus="focus">
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="NY"
                  />
                </motion.div>
              </motion.div>
            </div>
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label
                htmlFor="zipCode"
                className="text-foreground flex items-center"
              >
                ZIP Code
                {completedFields.has("zipCode") && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
                  </motion.div>
                )}
              </Label>
              <motion.div variants={inputVariants} whileFocus="focus">
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="bg-input border-border text-foreground transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="10001"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const StepIcon = (props: { icon: any }) => {
    const IconComponent = props.icon;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Floating Elements with Gold Glow */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 rounded-full bg-primary/10 blur-xl gold-glow"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-primary/10 blur-xl gold-glow"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                className="text-foreground/80 hover:text-foreground mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </motion.div>
          </Link>
          <motion.h1
            className="text-4xl font-bold text-foreground mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Welcome to GWU Agency
            <motion.div
              className="inline-block ml-2"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.h1>
          <motion.p
            className="text-foreground/80 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Let's get your GHL sub-account set up in just a few steps
          </motion.p>
        </div>

        {/* Progress Indicator */}
        <motion.div
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  index <= currentStep
                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "border-foreground/30 text-foreground/50"
                }`}
                whileHover={{ scale: 1.1 }}
                animate={
                  index === currentStep
                    ? {
                        boxShadow: [
                          "0 0 0 0 rgba(255, 215, 0, 0)",
                          "0 0 0 10px rgba(255, 215, 0, 0.1)",
                          "0 0 0 0 rgba(255, 215, 0, 0)",
                        ],
                      }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: index === currentStep ? Number.POSITIVE_INFINITY : 0,
                }}
              >
                <StepIcon icon={step.icon} />
              </motion.div>
              {index < steps.length - 1 && (
                <motion.div
                  className={`w-16 h-0.5 mx-2 transition-all duration-500 ${
                    index < currentStep
                      ? "bg-primary shadow-sm shadow-primary/50"
                      : "bg-foreground/30"
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: index < currentStep ? 1 : 0.3 }}
                  transition={{
                    duration: 0.5,
                    delay: index < currentStep ? 0.2 : 0,
                  }}
                />
              )}
            </div>
          ))}
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-card-foreground flex items-center">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  >
                    <StepIcon icon={steps[currentStep].icon} />
                  </motion.div>
                  <span className="ml-3">{steps[currentStep].title}</span>
                </CardTitle>
                <p className="text-muted-foreground">
                  {steps[currentStep].description}
                </p>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <motion.div
                    whileHover={{ scale: 1.05, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="border-border text-foreground hover:bg-accent bg-transparent disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  </motion.div>

                  {currentStep === steps.length - 1 ? (
                    <motion.div
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 relative overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          initial={{ x: "-100%" }}
                          whileHover={{ x: "100%" }}
                          transition={{ duration: 0.6 }}
                          
                        />
                        <span className="relative z-10 flex items-center">
                          {isLoading ? "Creating Sub-Account..." : "Create Sub-Account"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </span>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.05, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={nextStep}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                      >
                        Next Step
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
