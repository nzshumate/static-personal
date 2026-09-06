<script setup lang="ts">
usePageMeta('Contact', 'Tell me the hard problem. Connect with Nathan Shumate on GitHub or LinkedIn.')
const form = reactive({ name: '', email: '', message: '', company: '' })
const sending = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  sending.value = true
  error.value = ''
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'Your message could not be sent.')
    sent.value = true
    form.name = ''
    form.email = ''
    form.message = ''
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Your message could not be sent.'
  } finally {
    sending.value = false
  }
}
</script>
<template>
  <EditorialPage>
    <PageHero label="05 / Contact" title="Tell me the hard problem." description="Those are usually the fun ones." note="Start a conversation" />
    <section class="contact-layout" aria-label="Contact Nathan">
      <div class="contact-intro"><p>Something you’re building. A system that needs a fresh perspective. An idea you can’t quite leave alone.<br><br>I’m interested.</p><div class="contact-links"><a href="https://github.com/nzshumate" target="_blank" rel="noreferrer"><span><small>Code & experiments</small>GitHub</span><span aria-hidden="true">↗</span></a><a href="https://www.linkedin.com/in/nathan-shumate-996472116" target="_blank" rel="noreferrer"><span><small>Connect professionally</small>LinkedIn</span><span aria-hidden="true">↗</span></a></div></div>
      <form v-if="!sent" class="contact-form" @submit.prevent="submit">
        <p class="eyebrow">Send a note</p>
        <label>Name<input v-model="form.name" name="name" autocomplete="name" maxlength="80" required /></label>
        <label>Email<input v-model="form.email" name="email" type="email" autocomplete="email" maxlength="254" required /></label>
        <label>Message<textarea v-model="form.message" name="message" minlength="10" maxlength="5000" rows="7" required /></label>
        <label class="contact-honeypot" aria-hidden="true">Company<input v-model="form.company" name="company" tabindex="-1" autocomplete="off" /></label>
        <p v-if="error" class="contact-form-status is-error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="sending">{{ sending ? 'Sending…' : 'Send message' }} <span aria-hidden="true">↗</span></button>
        <p class="contact-privacy">Your address is used only to reply to this message.</p>
      </form>
      <div v-else class="contact-success" role="status"><p class="eyebrow">Message sent</p><h2>Thanks. I’ll be in touch.</h2><button type="button" class="text-link" @click="sent = false">Send another message</button></div>
    </section>
    <div class="contact-endnote"><span aria-hidden="true">↳</span><p>Or take the scenic route.<br><NuxtLink to="/" :prefetch="false">Back to the journey →</NuxtLink></p></div>
  </EditorialPage>
</template>
