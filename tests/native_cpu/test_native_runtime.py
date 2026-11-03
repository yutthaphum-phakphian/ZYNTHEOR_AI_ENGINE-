import hashlib, json, sys, tempfile, unittest
from pathlib import Path
import torch
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'training/native_cpu'))
from native_cpu_model import ZyntheorNativeCPU, count_parameters
from native_runtime import load_verified_model, probe, parameter_digest, generate

class NativeRuntimeTests(unittest.TestCase):
    def build_fixture(self, root: Path):
        (root/'training/registry').mkdir(parents=True)
        (root/'training/native_cpu').mkdir(parents=True)
        ckpt_dir=root/'training/checkpoints/native_cpu';ckpt_dir.mkdir(parents=True)
        cfg={'architecture':{'d_model':32,'n_layers':1,'n_heads':4,'context':16}}
        (root/'training/native_cpu/config.json').write_text(json.dumps(cfg))
        (root/'training/dataset').mkdir(parents=True)
        (root/'training/dataset/samples.json').write_text('[]')
        (root/'training/dataset/manifest.json').write_text('{}')
        samples_sha=hashlib.sha256((root/'training/dataset/samples.json').read_bytes()).hexdigest()
        manifest_sha=hashlib.sha256((root/'training/dataset/manifest.json').read_bytes()).hexdigest()
        model=ZyntheorNativeCPU(**cfg['architecture'])
        final=parameter_digest(model)
        payload={'identity':'CORE_NATIVE','parent_model_id':None,'random_initialization':True,
                 'architecture':cfg['architecture'],'parameter_count':count_parameters(model),
                 'model_state_dict':model.state_dict(),'final_weights_sha256':final,
                 'dataset':{'samples_sha256':samples_sha,'manifest_sha256':manifest_sha}}
        path=ckpt_dir/'fixture.pt';torch.save(payload,path)
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        identity={'identity':'CORE_NATIVE','model_id':'zyntheor-native-cpu-001','status':'TRAINED_EXPERIMENTAL',
                  'parent_model_id':None,'initialization':'RANDOM_SEED_INITIALIZATION','checkpoint':'training/checkpoints/native_cpu/fixture.pt',
                  'checkpoint_sha256':digest,'final_weights_sha256':final,'parameter_count':count_parameters(model),
                  'architecture':cfg['architecture'],'dataset_samples_sha256':samples_sha,'dataset_manifest_sha256':manifest_sha}
        (root/'training/registry/native_model_identity.json').write_text(json.dumps(identity))
        return path

    def test_missing_checkpoint_is_not_ready(self):
        result=probe(ROOT)
        self.assertFalse(result['ready'])
        self.assertEqual(result['status'],'MODEL_NOT_FOUND')
        self.assertEqual(result['reason'],'NATIVE_MODEL_NOT_TRAINED')

    def test_verified_local_checkpoint_loads(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.build_fixture(root)
            model,identity,digest=load_verified_model(root)
            self.assertEqual(identity['identity'],'CORE_NATIVE')
            self.assertEqual(len(digest),64)
            self.assertTrue(torch.isfinite(model(torch.tensor([[257,65,66]]))).all().item())
            runtime=probe(root)
            self.assertTrue(runtime['ready'])
            self.assertTrue(runtime['inference_ready'])
            self.assertEqual(runtime['generation_probe'],'PASS')

    def test_verified_native_generation_returns_experimental_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);self.build_fixture(root)
            result=generate('test prompt',max_new_tokens=1,root=root)
            self.assertEqual(result['status'],'GENERATED_EXPERIMENTAL')
            self.assertFalse(result['production_approved'])

    def test_checkpoint_digest_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);path=self.build_fixture(root)
            with path.open('ab') as f:f.write(b'tamper')
            with self.assertRaisesRegex(RuntimeError,'DIGEST_MISMATCH'):
                load_verified_model(root)

if __name__=='__main__':unittest.main()
