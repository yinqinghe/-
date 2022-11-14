class CrackGeetest():
    #...

    def get_geetest_button(self):
        ''' 获取初始验证按钮,return：按钮对象 '''
        button = self.wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'geetest_radar_tip')))
        return button

    def open(self):
        ''' 打开网页输入用户名密码, return: None '''
        self.browser.get(self.url)
        email = self.wait.until(EC.presence_of_element_located((By.ID, 'email')))
        password = self.wait.until(EC.presence_of_element_located((By.ID, 'password')))
        email.send_keys(self.email)
        password.send_keys(self.password)

    def crack(self):
        # 输入用户名密码
        self.open()
        # 点击验证按钮
        button = self.get_geetest_button()
        button.click()
        #...
    #...

    def get_position(self):
        ''' 获取验证码位置, return: 验证码位置(元组) '''
        img = self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'geetest_canvas_img')))
        time.sleep(2)
        location = img.location
        size = img.size
        top, bottom, left, right = location['y'], location['y'] + size['height'], location['x'], location['x'] + size[
            'width']
        return (top, bottom, left, right)


    def get_screenshot(self):
        ''' 获取网页截图, return: 截图对象 '''
        # 浏览器截屏
        screenshot = self.browser.get_screenshot_as_png()
        screenshot = Image.open(BytesIO(screenshot))
        return screenshot



    def get_geetest_image(self, name='captcha.png'):
        ''' 获取验证码图片, return: 图片对象 '''
        top, bottom, left, right = self.get_position()
        print('验证码位置', top, bottom, left, right)
        screenshot = self.get_screenshot()
        # 从网页截屏图片中裁剪处理验证图片
        captcha = screenshot.crop((left, top, right, bottom))
        captcha.save(name)
        return captcha


    def get_slider(self):
        ''' 获取滑块, return: 滑块对象 '''
        slider = self.wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'geetest_slider_button')))
        return slider

    def crack(self):

    # ...
    # 获取验证码图片
    image1 = self.get_geetest_image('captcha1.png')
    # 点按呼出缺口
    slider = self.get_slider()
    slider.click()
    # 获取带缺口的验证码图片
    image2 = self.get_geetest_image('captcha2.png')