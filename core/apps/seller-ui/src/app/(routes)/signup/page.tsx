'use client';

import { useMutation } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { countries } from 'apps/seller-ui/src/constants/countries';
import CreateShop from '../../../shared/modules/auth/CreateShop';
import axios, { AxiosError } from 'axios';
import { CircleDollarSign, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const SignUp = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [timer, setTimer] = useState(60);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sellerData, setSellerData] = useState<FormData | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [sellerId, setSellerId] = useState<FormData | null>(null);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/seller-registration`,
        data
      );
      return response.data;
    },
    onSuccess: (_, formData) => {
      setSellerData(formData);
      setShowOTP(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
    onError: (error: AxiosError) => {
      const errorMessage =
        (error.response?.data as { message: string })?.message ||
        'Something went wrong ! Try again later.';
      setServerError(errorMessage);
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async () => {
      if (!sellerData) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-seller`,
        { ...sellerData, otp: otp.join('') }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setSellerId(data?.seller?.id);
      setActiveStep(2);
    },
  });

  const connectStripe = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-stripe-link`,
        {
          sellerId,
        }
      );

      if (response.data?.url) {
        window.location.href = response.data?.url;
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
    }
  };

  const onSubmit = (data: any) => {
    signupMutation.mutate(data);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^[0-9]$/.test(value)) return;

    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);

    if (value && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOTP = [...otp];
        newOTP[index] = '';
        setOtp(newOTP);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const resendOTP = () => {
    if (sellerData) {
      signupMutation.mutate(sellerData);
    }
  };

  return (
    <div className="w-full flex flex-col pt-10 min-h-screen items-center ">
      {/* Stepper */}
      <div className="relative flex items-center justify-between md:w-1/2 mb-8">
        <div className="absolute top-1/4 left-0 w-[80%] md:w-[90%] h-1 bg-gray-300 -z-10" />
        {[1, 2, 3].map((step) => (
          <div key={step}>
            <div
              className={`w-10 h-10 items-center flex justify-center rounded-full text-white font-bold ${
                step <= activeStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              {step}
            </div>
            <span className="ml-[15px]">
              {step === 1
                ? 'Create Account.'
                : step === 2
                ? 'Setup Shop'
                : 'Connect Bank'}
            </span>
          </div>
        ))}
      </div>
      {/* Steps content */}
      <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
        {activeStep === 1 && (
          <>
            {!showOTP ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="text-2xl font-semibold text-center mb-4">
                  Create Account
                </h3>
                <label className="block text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full p-2 border border-gray-300 outline-0 rounded-lg mb-1"
                  {...register('name', {
                    required: 'Name is required',
                  })}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm">
                    {String(errors.name.message)}
                  </p>
                )}
                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="example.mail@email.com"
                  className="w-full p-2 border border-gray-300 outline-0 rounded-lg mb-1"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">
                    {String(errors.email.message)}
                  </p>
                )}
                <label className="block text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  className="w-full p-2 border border-gray-300 outline-0 rounded-lg mb-1"
                  {...register('phone_number', {
                    required: 'Phone number is required.',
                    pattern: {
                      value: /^\+?[1-9]\d{1,14}$/,
                      message: 'Invalid phone number.',
                    },
                    minLength: {
                      value: 10,
                      message: 'Phone number must be at least 10 digits long.',
                    },
                    maxLength: {
                      value: 15,
                      message: 'Phone number must be at most 15 digits long.',
                    },
                  })}
                />
                {errors.phone_number && (
                  <p className="text-red-500 text-sm">
                    {String(errors.phone_number.message)}
                  </p>
                )}
                <label className="block text-gray-700 mb-1">Country</label>
                <select
                  className="w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1"
                  {...register('country', { required: 'Country is required' })}
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="text-red-500 text-sm">
                    {String(errors.country.message)}
                  </p>
                )}
                <label className="block text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={passwordVisible ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className="w-full p-2 border border-gray-300 outline-0 rounded-lg mb-1"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters long',
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                  >
                    {passwordVisible ? <Eye /> : <EyeOff />}
                  </button>
                  {errors.password && (
                    <p className="text-red-500 text-sm">
                      {String(errors.password.message)}
                    </p>
                  )}
                  {serverError && (
                    <p className="text-red-500 text-sm">{serverError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full text-lg cursor-pointer mt-4 bg-black text-white py-2 rounded-lg hover:bg-gray-700 transition duration-200 ease-in-out"
                >
                  {signupMutation.isPending ? 'Signing up ...' : 'Sign Up'}
                </button>
                {signupMutation.isError &&
                  signupMutation.error instanceof AxiosError && (
                    <p className="text-sm text-red-500 mt-2">
                      {(
                        signupMutation.error.response?.data as {
                          message?: string;
                        }
                      )?.message || signupMutation.error.message}
                    </p>
                  )}
                <p className="pt-3 text-center">
                  Already have an account ? {'  '}
                  <Link href="/login" className="text-blue-500">
                    Login
                  </Link>
                </p>
              </form>
            ) : (
              <div>
                <h3 className="text-xl font-semibold text-center mb-4">
                  Enter OTP
                </h3>
                <div className="flex justify-center gap-6">
                  {otp?.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                      }}
                      maxLength={1}
                      className="w-12 h-12 text-center border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    />
                  ))}
                </div>
                <button
                  className="w-full mt-4 text-lg cursor-pointer bg-black text-white py-2 rounded-lg"
                  disabled={verifyOTPMutation.isPending}
                  onClick={() => verifyOTPMutation.mutate()}
                >
                  {verifyOTPMutation.isPending ? 'Verifying ...' : 'Verify OTP'}
                </button>
                <p>
                  {canResend ? (
                    <button
                      onClick={resendOTP}
                      className="text-blue-500 cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    `Resend OTP in ${timer} seconds`
                  )}
                </p>
                {verifyOTPMutation?.isError &&
                  verifyOTPMutation.error instanceof AxiosError && (
                    <p className="text-red-500 text-sm mt-2">
                      {verifyOTPMutation.error.response?.data?.message ||
                        verifyOTPMutation.error.message}
                    </p>
                  )}
              </div>
            )}
          </>
        )}
        {activeStep === 2 && (
          <CreateShop
            sellerId={typeof sellerId === 'string' ? sellerId : ''}
            setActiveStep={setActiveStep}
          />
        )}
        {activeStep === 3 && (
          <div className="text-center">
            <h3 className="text-2xl font-semibold">Withdraw method</h3>
            <br />
            <button
              className="w-full m-auto items-center justify-center gap-3 text-lg bg-[#334155] text-white py-2 rounded-lg flex"
              onClick={connectStripe}
            >
              Connect Stripe
              <CircleDollarSign />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignUp;
