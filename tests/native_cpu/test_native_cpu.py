import json, sys, unittest, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'training/native_cpu'))
from native_cpu_model import ZyntheorNativeCPU, count_parameters, encode_bytes, decode_bytes
import train_native_cpu as trainer
from train_native_cpu import validate_dataset, hardware, check_governance

class NativeCpuTests(unittest.TestCase):
    def test_byte_tokenizer_round_trip(self):
        text='ZYNTHEOR ภาษาไทย code'
        self.assertEqual(decode_bytes(encode_bytes(text)),text)
    def test_architecture_is_in_target_parameter_band(self):
        cfg=json.loads((ROOT/'training/native_cpu/config.json').read_text())
        model=ZyntheorNativeCPU(**cfg['architecture'])
        n=count_parameters(model)
        self.assertGreaterEqual(n,cfg['parameter_range'][0]); self.assertLessEqual(n,cfg['parameter_range'][1])
    def test_forward_shape(self):
        model=ZyntheorNativeCPU(d_model=32,n_layers=1,n_heads=4,context=16)
        import torch
        out=model(torch.randint(0,259,(2,8)))
        self.assertEqual(tuple(out.shape),(2,8,259))
    def test_dataset_integrity_and_splits(self):
        result=validate_dataset()
        self.assertEqual(result['sample_count'],15)
        self.assertEqual(result['split_counts'],{'train':8,'validation':3,'test':4})
    def test_training_fails_closed_until_data_review(self):
        with self.assertRaises(PermissionError): check_governance()
    def test_provenance_sample_hashes_match_current_dataset(self):
        manifest=json.loads((ROOT/'training/dataset/DATASET_PROVENANCE_MANIFEST.json').read_text())
        rows=json.loads((ROOT/'training/dataset/samples.json').read_text())
        by_id={sample['id']:sample for sample in manifest['samples']}
        import hashlib
        for row in rows:
            digest=hashlib.sha256(json.dumps(row,ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()
            self.assertEqual(by_id[row['id']]['sampleSha256'],digest)
        self.assertEqual(manifest['samplesSha256'],hashlib.sha256((ROOT/'training/dataset/samples.json').read_bytes()).hexdigest())
    def test_hardware_probe_reports_cpu_or_gpu(self):
        result=hardware()
        self.assertIn('cuda_available',result); self.assertIn('cpu_count',result)
    def test_native_identity_updates_preserve_registry_envelope_and_other_models(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry_path=Path(tmp)/'native_model_identity.json'
            original={'registry_version':'1.0.0','models':[
                {'model_id':'adapted-model','identity':'CORE_ADAPTED','status':'REGISTERED'},
                {'model_id':'zyntheor-native-cpu-001','identity':'CORE_NATIVE','status':'NOT_TRAINED'}
            ]}
            registry_path.write_text(json.dumps(original))
            prior=trainer.IDENTITY
            try:
                trainer.IDENTITY=registry_path
                self.assertEqual(trainer.load_native_identity()['status'],'NOT_TRAINED')
                trainer.save_native_identity({'model_id':'zyntheor-native-cpu-001','identity':'CORE_NATIVE','status':'TRAINED_EXPERIMENTAL','checkpoint':'training/checkpoints/native_cpu/test.pt'})
                updated=json.loads(registry_path.read_text())
            finally:
                trainer.IDENTITY=prior
            self.assertEqual(len(updated['models']),2)
            self.assertEqual(updated['models'][0]['identity'],'CORE_ADAPTED')
            self.assertEqual(updated['models'][1]['status'],'TRAINED_EXPERIMENTAL')
            self.assertNotIn('model_id',updated)

if __name__=='__main__': unittest.main()
