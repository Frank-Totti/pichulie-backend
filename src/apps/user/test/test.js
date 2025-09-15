const requestPasswordReset = async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: 'Email is required' });
  
      const user = await User.findOne({ email });
      if (!user) return res.status(202).json({ success: true, message: 'You will receive a reset link' });
  
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();
  
      // --- comentar envío de email para prueba ---
      // await transporter.sendMail(mailOptions);
  
      res.status(200).json({ success: true, message: 'Reset link sent successfully', token: resetToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  