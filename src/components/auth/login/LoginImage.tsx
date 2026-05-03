import { motion } from 'framer-motion'

function LoginImage() {
  return (
    <section className="relative hidden lg:block w-1/2 h-full">
      <motion.div 
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img
          src="img/login-img3.png"
          alt="Login Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/20 to-black/80" />
        
        {/* Text */}
        <div className="absolute bottom-16 left-16 right-16 z-10 text-white">
          <motion.h2 
            className="text-[32px] font-bold mb-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Modern Eğitimin Yeni Yüzü
          </motion.h2>
          <motion.p 
            className="text-[15px] font-medium text-white/90 leading-relaxed max-w-md"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Öğrenciler ve öğretmenler için tasarlanmış, sade ve güçlü bir akademik deneyim platformu.
          </motion.p>
        </div>
      </motion.div>
    </section>
  )
}

export default LoginImage
