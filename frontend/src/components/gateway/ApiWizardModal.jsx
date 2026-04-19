import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import InputField from "../ui/InputField";
import Toggle from "../ui/Toggle";
import loadBalancingVideo from "../../animation videos/Load balacning .mp4";
import cachingVideo from "../../animation videos/cacheing .mp4";

function LoadBalancingExplainer() {
  return (
    <div className="wizard-explainer">
      <h4>What is Load Balancing?</h4>
      <p className="muted">
        If 1 million users hit your app at the same time, sending all traffic to one server will
        crash it. Load balancing spreads requests across multiple identical servers so traffic is
        shared, response times stay stable, and one slow server does not take down your whole API.
      </p>
      <div className="wizard-video-wrap">
        <video
          className="wizard-video"
          src={loadBalancingVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}

function CachingExplainer() {
  return (
    <div className="wizard-explainer">
      <h4>What is Caching?</h4>
      <p className="muted">
        Without caching, your backend does the same work again and again. If 1 million users ask
        for the same data, calling the server 1 million times is wasteful. With caching, the first
        request fetches and stores data, and repeated requests are served fast from gateway cache
        until TTL expires.
      </p>
      <div className="wizard-video-wrap">
        <video
          className="wizard-video wizard-video-cache"
          src={cachingVideo}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  );
}

function RateLimitingExplainer() {
  return (
    <div className="wizard-explainer">
      <h4>What is Rate Limiting?</h4>
      <p className="muted">
        Rate limiting protects your API from abuse, bots, and DDoS-style floods. The gateway counts
        requests per client in a time window. Normal users stay under the limit and continue, but
        suspicious or excessive traffic is blocked with 429 so one attacker cannot exhaust your
        infrastructure.
      </p>
    </div>
  );
}

function createEmptyRoute() {
  const id = `route-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    path: "/",
    cache: true,
    cacheTTL: 60,
    rateLimit: 10
  };
}

function getInitialState(initialData) {
  const targets = initialData?.targets?.length ? initialData.targets : [""];
  const routes = initialData?.routes?.length
    ? initialData.routes.map((route) => ({
        ...route,
        id: route.id || `route-${Math.random().toString(36).slice(2, 10)}`
      }))
    : [createEmptyRoute()];

  return {
    name: initialData?.name || "",
    targets,
    routes
  };
}

export default function ApiWizardModal({ mode, initialData, onClose, onSubmit }) {
  const modalSessionId = useRef(`wizard-${Math.random().toString(36).slice(2, 10)}`).current;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(getInitialState(initialData));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isEdit = mode === "edit";

  const canContinue = useMemo(() => {
    if (step === 0) {
      return form.name.trim().length > 1 && form.targets.every((target) => target.trim().startsWith("http"));
    }
    if (step === 1) {
      return form.routes.every(
        (route) => route.path.trim().startsWith("/") && (!route.cache || Number(route.cacheTTL) > 0)
      );
    }
    if (step === 2) {
      return form.routes.every((route) => Number(route.rateLimit) > 0);
    }
    return true;
  }, [step, form]);

  const updateTarget = (index, value) => {
    setForm((current) => {
      const nextTargets = [...current.targets];
      nextTargets[index] = value;
      return { ...current, targets: nextTargets };
    });
  };

  const addTarget = () => {
    setForm((current) => ({ ...current, targets: [...current.targets, ""] }));
  };

  const removeTarget = (index) => {
    setForm((current) => ({
      ...current,
      targets: current.targets.length === 1 ? current.targets : current.targets.filter((_, i) => i !== index)
    }));
  };

  const updateRoute = (index, patch) => {
    setForm((current) => ({
      ...current,
      routes: current.routes.map((route, i) => (i === index ? { ...route, ...patch } : route))
    }));
  };

  const addRoute = () => {
    setForm((current) => ({ ...current, routes: [...current.routes, createEmptyRoute()] }));
  };

  const removeRoute = (index) => {
    setForm((current) => ({
      ...current,
      routes: current.routes.length === 1 ? current.routes : current.routes.filter((_, i) => i !== index)
    }));
  };

  const submit = async () => {
    setPending(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      targets: form.targets.map((target) => target.trim()).filter(Boolean),
      routes: form.routes.map((route) => ({
        path: route.path.trim(),
        cache: Boolean(route.cache),
        cacheTTL: route.cache ? Number(route.cacheTTL || 0) : 0,
        rateLimit: Number(route.rateLimit || 0)
      }))
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (nextError) {
      setError(nextError.message || "Unable to save API");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title={isEdit ? "Update API" : "Create API"} onClose={onClose} className="wizard-modal">
      <div className="wizard-shell">
        <div className="wizard-steps">
          <span className={step === 0 ? "active" : ""}>Basics</span>
          <span className={step === 1 ? "active" : ""}>Routes</span>
          <span className={step === 2 ? "active" : ""}>Rate Limit</span>
          <span className={step === 3 ? "active" : ""}>Review</span>
        </div>

        <div className="wizard-stage">
          {step === 0 ? (
            <section>
              <InputField
                id="api-name"
                label="Gateway Name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Orders API Gateway"
                required
              />

              <p className="muted">
                Backend Targets. Add multiple links only when you want load balancing between identical services.
              </p>

              {form.targets.map((target, index) => (
                <div className="inline-field" key={`${modalSessionId}-target-${index}`}>
                  <input
                    type="url"
                    value={target}
                    onChange={(event) => updateTarget(index, event.target.value)}
                    placeholder="https://your-backend.example.com"
                  />
                  <button type="button" className="icon-btn" onClick={() => removeTarget(index)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" onClick={addTarget}>
                <Plus size={14} /> Add target
              </button>

              <LoadBalancingExplainer />
            </section>
          ) : null}

          {step === 1 ? (
            <section>
              {form.routes.map((route, index) => (
                <div className="route-form-card" key={route.id || `${modalSessionId}-route-${index}`}>
                  <div className="route-header">
                    <h4>Route {index + 1}</h4>
                    <button type="button" className="icon-btn" onClick={() => removeRoute(index)}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <InputField
                    id={`route-path-${index}`}
                    label="Path"
                    value={route.path}
                    onChange={(value) => updateRoute(index, { path: value })}
                    placeholder="/orders"
                    required
                  />

                  <Toggle
                    checked={Boolean(route.cache)}
                    onChange={(checked) => updateRoute(index, { cache: checked })}
                    label="Cache"
                  />

                  <InputField
                    id={`route-ttl-${index}`}
                    label="Cache TTL (seconds)"
                    value={String(route.cacheTTL ?? "")}
                    onChange={(value) => updateRoute(index, { cacheTTL: value })}
                    type="number"
                    disabled={!route.cache}
                  />
                </div>
              ))}

              <button type="button" className="btn btn-ghost" onClick={addRoute}>
                <Plus size={14} /> Add route
              </button>

              <CachingExplainer />
            </section>
          ) : null}

          {step === 2 ? (
            <section>
              <p className="muted">Set request limits for each route to prevent abuse and traffic spikes.</p>

              {form.routes.map((route, index) => (
                <div className="route-form-card" key={`rate-${route.id || `${modalSessionId}-route-rate-${index}`}`}>
                  <div className="route-header">
                    <h4>{route.path || `Route ${index + 1}`}</h4>
                    <span className="muted">per minute</span>
                  </div>

                  <InputField
                    id={`route-rate-limit-${index}`}
                    label="Rate Limit"
                    value={String(route.rateLimit ?? "")}
                    onChange={(value) => updateRoute(index, { rateLimit: value })}
                    type="number"
                    required
                  />
                </div>
              ))}

              <RateLimitingExplainer />
            </section>
          ) : null}

          {step === 3 ? (
            <section>
              <p className="muted">This human-friendly form will now be converted into JSON payload automatically.</p>
              <div className="review-block">
                <strong>{form.name}</strong>
                <p>{form.targets.length} backend target(s)</p>
                <p>{form.routes.length} route rule(s)</p>
                <p>Rate limiting configured for all routes</p>
              </div>
            </section>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="wizard-actions">
          <Button variant="ghost" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0 || pending}>
            <ArrowLeft size={14} /> Back
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep((current) => current + 1)} disabled={!canContinue || pending}>
              Next <ArrowRight size={14} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={pending || !canContinue}>
              {pending ? "Saving..." : isEdit ? "Save Changes" : "Create API"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
